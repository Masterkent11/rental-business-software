import type postgres from 'postgres';
import { sql } from './db.ts';
import {
  AmountMismatchError,
  BookingNotHeldError,
  type BookingForPayment,
  type ConfirmationResult,
  type PaymentRepository,
} from '../../application/ports/payment-repository.ts';
import type { Payment } from '../../domain/money/payment.ts';
import type { Centavos } from '../../domain/shared/money.ts';
import { RESERVATION_DAYS } from '../../domain/applications/application.ts';

interface PaymentRow {
  id: string;
  organization_id: string;
  occupancy_id: string;
  amount_centavos: string;
  origin: Payment['origin'];
  state: Payment['state'];
  provider_ref: string | null;
  received_at: Date | null;
  recorded_at: Date;
}

const toPayment = (row: PaymentRow): Payment => ({
  id: row.id,
  organizationId: row.organization_id,
  occupancyId: row.occupancy_id,
  // bigint arrives as a string; parsing it is not optional.
  amountCentavos: Number(row.amount_centavos) as Centavos,
  origin: row.origin,
  state: row.state,
  providerRef: row.provider_ref,
  receivedAt: row.received_at,
  recordedAt: row.recorded_at,
});

export function postgresPaymentRepository(): PaymentRepository {
  return {
    async findPayableBooking(occupancyId) {
      return sql.begin(async (tx) => {
        // The occupancy is publicly readable for published inventory, but
        // `reservations` is organization-isolated — so the scope has to be
        // derived from the occupancy before the fee is visible. Read unscoped,
        // the join silently matches nothing and a payable reservation looks
        // like an expired hold.
        const [occupancy] = await tx<
          { organization_id: string; kind: string }[]
        >`
          select organization_id, kind
            from occupancies
           where id = ${occupancyId}
             and state = 'HELD'
             and expires_at > now()
        `;
        if (!occupancy) return null;

        await tx`select set_config('app.organization_id', ${occupancy.organization_id}, true)`;

        if (occupancy.kind === 'RESERVATION') {
          // A reservation fee is priced by the owner, not by nights. Different
          // promises about money, not two shapes of the same one.
          const [reservation] = await tx<{ fee: string }[]>`
            select fee_centavos::text as fee
              from reservations
             where occupancy_id = ${occupancyId}
               and state = 'PENDING_PAYMENT'
          `;
          if (!reservation) return null;

          return {
            occupancyId,
            organizationId: occupancy.organization_id,
            amountCentavos: Number(reservation.fee) as Centavos,
            nights: 0,
          } satisfies BookingForPayment;
        }

        const [booking] = await tx<
          { amount_centavos: string; nights: string }[]
        >`
          select
            -- Priced from the listing, in the database, in integer centavos.
            -- A client-supplied amount would be a client deciding what to pay.
            (l.price_centavos * (upper(o.during) - lower(o.during)))::text
              as amount_centavos,
            (upper(o.during) - lower(o.during))::text as nights
            from occupancies o
            join listings l
              on l.resource_id = o.resource_id
             and l.kind = 'SHORT_TERM'
             and l.state = 'PUBLISHED'
           where o.id = ${occupancyId}
        `;
        if (!booking) return null;

        return {
          occupancyId,
          organizationId: occupancy.organization_id,
          amountCentavos: Number(booking.amount_centavos) as Centavos,
          nights: Number(booking.nights),
        } satisfies BookingForPayment;
      }) as Promise<BookingForPayment | null>;
    },

    async startPayment({ occupancyId, amountCentavos, providerRef }) {
      const row = await sql.begin(async (tx) => {
        // The organization comes from the hold, not from a header: a customer
        // paying for a stay is a guest of this organization, not a member of
        // it, so there is no membership to scope by.
        const [occupancy] = await tx<{ organization_id: string }[]>`
          select organization_id from occupancies
           where id = ${occupancyId} and state = 'HELD'
        `;
        if (!occupancy) return null;

        await tx`select set_config('app.organization_id', ${occupancy.organization_id}, true)`;

        const [inserted] = await tx<PaymentRow[]>`
          insert into payments (
            organization_id, occupancy_id, amount_centavos, origin, state, provider_ref
          )
          values (${occupancy.organization_id}, ${occupancyId}, ${amountCentavos},
                  'ONLINE', 'PENDING', ${providerRef})
          returning id, organization_id, occupancy_id, amount_centavos::text,
                    origin, state, provider_ref, received_at, recorded_at
        `;
        return inserted ?? null;
      });

      if (!row) throw new BookingNotHeldError('That hold is no longer live');
      return toPayment(row as PaymentRow);
    },

    async confirmPayment(input): Promise<ConfirmationResult> {
      return sql.begin(async (tx) => {
        // Name the one row this callback is about. The payments table is
        // organization-isolated and a webhook has no organization context, so
        // the handler is granted exactly the row whose reference the provider
        // echoed back — see `payment_by_provider_ref`.
        await tx`select set_config('app.provider_ref', ${input.providerRef}, true)`;

        // Claim the event id. Providers retry, and a double-applied payment is
        // a refund conversation — so idempotency is a unique constraint, not a
        // check-then-act the next retry can slip past.
        //
        // `on conflict do nothing` rather than catching the violation: inside a
        // transaction a failed statement poisons the whole thing, so the
        // handler could not then read what the first delivery did. Losing the
        // insert is the signal, and it costs no exception.
        const claimed = await tx<{ provider_event_id: string }[]>`
          insert into provider_events (provider_event_id, provider, payload)
          values (${input.providerEventId}, ${input.provider},
                  ${input.rawPayload}::jsonb)
          on conflict (provider_event_id) do nothing
          returning provider_event_id
        `;

        if (claimed.length === 0) {
          const existing = await alreadyApplied(tx, input.providerRef);
          if (existing) return existing;
        }

        const [payment] = await tx<PaymentRow[]>`
          select id, organization_id, occupancy_id, amount_centavos::text,
                 origin, state, provider_ref, received_at, recorded_at
            from payments where provider_ref = ${input.providerRef}
        `;
        if (!payment) {
          throw new BookingNotHeldError('No payment for that reference');
        }

        // The provider's amount must match what we asked for. A mismatch is
        // not something to reconcile quietly later — it means the two sides
        // disagree about the price of a stay.
        if (Number(payment.amount_centavos) !== input.amountCentavos) {
          throw new AmountMismatchError(
            'The confirmed amount does not match the payment',
          );
        }

        await tx`select set_config('app.organization_id', ${payment.organization_id}, true)`;

        await tx`
          update payments
             set state = 'SUCCEEDED', received_at = ${input.occurredAt}
           where id = ${payment.id}
        `;

        const [occupancy] = await tx<{ kind: string }[]>`
          select kind from occupancies where id = ${payment.occupancy_id}
        `;

        if (occupancy?.kind === 'RESERVATION') {
          // A paid reservation is not a confirmed stay. It stays HELD — the
          // owner has not decided yet — but now for the full seven days rather
          // than the short window that covered the payment itself.
          await tx`
            update occupancies
               set expires_at = now() + interval '${sql.unsafe(String(RESERVATION_DAYS))} days'
             where id = ${payment.occupancy_id}
          `;
          await tx`
            update reservations
               set state = 'ACTIVE',
                   payment_id = ${payment.id},
                   expires_at = now() + interval '${sql.unsafe(String(RESERVATION_DAYS))} days'
             where occupancy_id = ${payment.occupancy_id}
          `;

          const [reservationRow] = await tx<{ id: string }[]>`
            select id from reservations where occupancy_id = ${payment.occupancy_id}
          `;

          await tx`
            insert into ledger_entries (
              organization_id, entry_type, amount_centavos, origin,
              actor_type, actor_id, cause_type, cause_id, occurred_at
            ) values (
              ${payment.organization_id}, 'PAYMENT_RECEIVED',
              ${Number(payment.amount_centavos)}, 'ONLINE',
              'PROVIDER', ${input.provider}, 'RESERVATION',
              ${reservationRow!.id}, ${input.occurredAt}
            )
          `;

          return {
            payment: toPayment({ ...payment, state: 'SUCCEEDED' }),
            // A reservation creates no stay: nobody is staying anywhere yet.
            stayId: '',
            applied: true,
          };
        }

        // The hold becomes real occupancy. Both HELD and COMMITTED sit inside
        // the exclusion constraint's predicate, so this row keeps its place in
        // the index and cannot collide with itself.
        await tx`
          update occupancies set state = 'COMMITTED'
           where id = ${payment.occupancy_id} and state = 'HELD'
        `;

        const [stay] = await tx<{ id: string }[]>`
          insert into stays (organization_id, occupancy_id, user_id, state)
          select ${payment.organization_id}, ${payment.occupancy_id},
                 o.held_by, 'CONFIRMED'
            from occupancies o where o.id = ${payment.occupancy_id}
          on conflict (occupancy_id) do update set state = stays.state
          returning id
        `;

        // Append-only, naming its actor and its cause.
        await tx`
          insert into ledger_entries (
            organization_id, entry_type, amount_centavos, origin,
            actor_type, actor_id, cause_type, cause_id, occurred_at
          ) values (
            ${payment.organization_id}, 'BOOKING_PREPAID',
            ${Number(payment.amount_centavos)}, 'ONLINE',
            'PROVIDER', ${input.provider}, 'PAYMENT', ${payment.id},
            ${input.occurredAt}
          )
        `;

        return {
          payment: toPayment({ ...payment, state: 'SUCCEEDED' }),
          stayId: stay!.id,
          applied: true,
        };
      }) as Promise<ConfirmationResult>;
    },
  };
}

/**
 * What a replayed event should return.
 *
 * The first delivery already did the work, so this reports it rather than
 * repeating it — the provider gets its 200 and stops retrying.
 */
async function alreadyApplied(
  tx: postgres.TransactionSql,
  providerRef: string,
): Promise<ConfirmationResult | null> {
  const [row] = await tx<PaymentRow[]>`
    select id, organization_id, occupancy_id, amount_centavos::text,
           origin, state, provider_ref, received_at, recorded_at
      from payments where provider_ref = ${providerRef}
  `;
  if (!row) return null;

  // The stay is organization-isolated, so the scope has to be set before it is
  // visible. Read after the payment, not joined to it.
  await tx`select set_config('app.organization_id', ${row.organization_id}, true)`;
  const [stay] = await tx<{ id: string }[]>`
    select id from stays where occupancy_id = ${row.occupancy_id}
  `;

  return { payment: toPayment(row), stayId: stay?.id ?? '', applied: false };
}
