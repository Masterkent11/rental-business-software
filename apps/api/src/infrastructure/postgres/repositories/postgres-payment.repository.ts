import type postgres from 'postgres';
import { sql } from '@/infrastructure/postgres/db.ts';
import {
  AmountMismatchError,
  BookingNotHeldError,
  type BookingForPayment,
  type ConfirmationResult,
  type PaymentRepository,
  type PendingPayment,
} from '@/application/ports/repositories/payment-repository.port.ts';
import type { Payment } from '@/domain/payments/payment.ts';
import type { Centavos } from '@/domain/shared/money.ts';
import { RESERVATION_DAYS } from '@/domain/applications/application.ts';

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
          { organization_id: string; kind: string; held_by: string | null }[]
        >`
          select organization_id, kind, held_by
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
            heldBy: occupancy.held_by,
            pricing: { kind: 'FIXED', amountCentavos: Number(reservation.fee) as Centavos },
          } satisfies BookingForPayment;
        }

        const [booking] = await tx<
          {
            starts_on: string;
            ends_on: string;
            guests: number | null;
            price_centavos: string;
            cleaning_fee_centavos: string;
            min_stay_nights: number | null;
            max_occupants: number;
          }[]
        >`
          select
            to_char(lower(o.during), 'YYYY-MM-DD') as starts_on,
            to_char(upper(o.during), 'YYYY-MM-DD') as ends_on,
            o.guests,
            l.price_centavos::text as price_centavos,
            l.cleaning_fee_centavos::text as cleaning_fee_centavos,
            l.min_stay_nights,
            l.max_occupants
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
          heldBy: occupancy.held_by,
          pricing: {
            kind: 'STAY',
            startsOn: booking.starts_on,
            endsOn: booking.ends_on,
            guests: booking.guests ?? 1,
            nightlyCentavos: Number(booking.price_centavos) as Centavos,
            cleaningFeeCentavos: Number(booking.cleaning_fee_centavos) as Centavos,
            minStayNights: booking.min_stay_nights ?? 1,
            maxOccupants: Math.max(booking.max_occupants, booking.guests ?? 1),
          },
        } satisfies BookingForPayment;
      }) as Promise<BookingForPayment | null>;
    },

    async findPendingPayment({ paymentId, occupancyId }) {
      return sql.begin(async (tx) => {
        // Same trick as findPayableBooking: occupancies is publicly readable,
        // payments is not, so the scope has to come from the occupancy before
        // the payment is visible at all.
        const [occupancy] = await tx<
          { organization_id: string; held_by: string | null }[]
        >`
          select organization_id, held_by from occupancies where id = ${occupancyId}
        `;
        if (!occupancy) return null;

        await tx`select set_config('app.organization_id', ${occupancy.organization_id}, true)`;

        const [payment] = await tx<
          { provider_ref: string | null; amount_centavos: string }[]
        >`
          select provider_ref, amount_centavos::text
            from payments
           where id = ${paymentId}
             and occupancy_id = ${occupancyId}
             and state = 'PENDING'
        `;
        if (!payment || !payment.provider_ref) return null;

        return {
          occupancyId,
          providerRef: payment.provider_ref,
          amountCentavos: Number(payment.amount_centavos) as Centavos,
          heldBy: occupancy.held_by,
        } satisfies PendingPayment;
      }) as Promise<PendingPayment | null>;
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

        // Guards a second race the event-id claim above does not: two
        // confirmations carrying *different* event ids (a provider retry with
        // a fresh id, or — since this repository also backs the client-
        // triggered sandbox confirmation — a double-tapped button) can both
        // read this payment as PENDING before either commits. Conditioning
        // the update on the state still being PENDING, and checking the row
        // count, turns the second one into an ordinary replay instead of a
        // second stay and a second ledger entry: whichever transaction's
        // update loses the race sees zero rows change and reports what the
        // winner already did, exactly like the identical-event-id path above.
        // Guards a second race the event-id claim above does not: two
        // confirmations carrying *different* event ids (a provider retry with
        // a fresh id, or — since this repository also backs the client-
        // triggered sandbox confirmation — a double-tapped button) can both
        // read this payment as PENDING before either commits. Conditioning
        // the update on the state still being PENDING, and checking the row
        // count, turns the second one into an ordinary replay instead of a
        // second stay and a second ledger entry: whichever transaction's
        // update loses the race sees zero rows change and reports what the
        // winner already did, exactly like the identical-event-id path above.
        const settled = await tx<{ id: string }[]>`
          update payments
             set state = 'SUCCEEDED', received_at = ${input.occurredAt}
           where id = ${payment.id} and state = 'PENDING'
          returning id
        `;
        if (settled.length === 0) {
          const existing = await alreadyApplied(tx, input.providerRef);
          if (existing) return existing;
        }

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

        const [context] = await tx<
          { held_by: string | null; title: string; starts_on: string; ends_on: string }[]
        >`
          select o.held_by, coalesce(l.title, r.label) as title,
                 to_char(lower(o.during), 'YYYY-MM-DD') as starts_on,
                 to_char(upper(o.during), 'YYYY-MM-DD') as ends_on
            from occupancies o
            join rentable_resources r on r.id = o.resource_id
            left join listings l on l.resource_id = o.resource_id and l.kind = 'SHORT_TERM'
           where o.id = ${payment.occupancy_id}
           limit 1
        `;

        return {
          payment: toPayment({ ...payment, state: 'SUCCEEDED' }),
          stayId: stay!.id,
          applied: true,
          stay: context
            ? {
                stayId: stay!.id,
                guestId: context.held_by,
                organizationId: payment.organization_id,
                listingTitle: context.title,
                startsOn: context.starts_on,
                endsOn: context.ends_on,
              }
            : null,
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
