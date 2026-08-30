import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { postgresPaymentRepository } from '@/infrastructure/postgres/repositories/postgres-payment.repository.ts';
import { postgresOccupancyRepository } from '@/infrastructure/postgres/repositories/postgres-occupancy.repository.ts';
import { sql, withScope } from '@/infrastructure/postgres/db.ts';
import { placeHold } from '@/application/bookings/place-hold/place-hold.use-case.ts';
import { AmountMismatchError, BookingNotHeldError } from '@/application/ports/repositories/payment-repository.port.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { sandboxPaymentGateway } from '@/infrastructure/payments/sandbox-payment-gateway.adapter.ts';
import { confirmBookingPayment } from '@/application/payments/confirm-booking-payment/confirm-booking-payment.use-case.ts';
import {
  simulateBookingPayment,
  PaymentNotOwnedError,
  SimulationUnavailableError,
} from '@/application/payments/simulate-booking-payment/simulate-booking-payment.use-case.ts';

const live = Boolean(process.env.DATABASE_URL);
const suite = live ? describe : describe.skip;

const GUEST = '99999999-9999-4999-8999-999999999999';

const BED = 'b3333333-0000-0000-0000-000000000002';
const VILLA_ORG = '33333333-3333-3333-3333-333333333333';
const SKYLINE_ORG = '22222222-2222-2222-2222-222222222222';
const SANTOS_ORG = '11111111-1111-1111-1111-111111111111';
/** ₱450/night in the seed. */
const NIGHTLY = 45_000;

suite('payments against real PostgreSQL', { timeout: 30_000 }, () => {
  const payments = postgresPaymentRepository();
  const hold = placeHold(postgresOccupancyRepository());
  const users = postgresUserRepository();

  /** One transaction: six round trips to another region overran the hook budget. */
  const reset = async () => {
    await sql.begin(async (tx) => {
      for (const organizationId of [VILLA_ORG, SKYLINE_ORG, SANTOS_ORG]) {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;
        await tx`update payments set state = 'FAILED' where state = 'PENDING'`;
        await tx`
          update occupancies set state = 'CANCELLED'
           where state in ('HELD','COMMITTED')
        `;
        await tx`delete from resource_night_status`;
      }
    });
  };

  /** The guest exists because the suite makes it exist, not because someone
   *  seeded it by hand — which passes on one machine and fails on the next. */
  const ensureGuest = async () => {
    await users.createProfile({
      id: GUEST,
      email: 'guest@example.test',
      mobile: null,
    });
  };

  beforeAll(ensureGuest);
  beforeEach(reset);
  afterAll(async () => {
    await reset();
    await sql.end({ timeout: 5 });
  });

  const heldBooking = async (startsOn: string, endsOn: string) =>
    hold({ heldBy: GUEST, resourceId: BED, startsOn, endsOn });

  it('prices the stay from the listing, not from the request', async () => {
    // A client-supplied amount is a client deciding what to pay.
    const booking = await heldBooking('2027-06-01', '2027-06-04');
    const payable = await payments.findPayableBooking(booking.id);

    expect(payable).not.toBeNull();
    expect(payable!.nights).toBe(3);
    expect(payable!.amountCentavos).toBe(NIGHTLY * 3);
  });

  it('will not price an expired hold', async () => {
    const booking = await heldBooking('2027-06-10', '2027-06-12');
    await withScope(VILLA_ORG, (tx) => tx`
      update occupancies set expires_at = now() - interval '1 minute'
       where id = ${booking.id}
    `);

    expect(await payments.findPayableBooking(booking.id)).toBeNull();
  });

  describe('confirming a payment', () => {
    const confirm = (providerRef: string, eventId: string, amount: number) =>
      payments.confirmPayment({
        providerEventId: eventId,
        provider: 'sandbox',
        providerRef,
        amountCentavos: amount as never,
        occurredAt: new Date('2027-06-01T10:00:00Z'),
        rawPayload: JSON.stringify({ eventId }),
      });

    const started = async (startsOn: string, endsOn: string) => {
      const booking = await heldBooking(startsOn, endsOn);
      const payable = await payments.findPayableBooking(booking.id);
      const providerRef = `sbx_${randomUUID()}`;
      await payments.startPayment({
        occupancyId: booking.id,
        amountCentavos: payable!.amountCentavos,
        providerRef,
      });
      return { booking, providerRef, amount: payable!.amountCentavos };
    };

    it('commits the hold, creates the stay, and writes the ledger', async () => {
      const { booking, providerRef, amount } = await started('2027-07-01', '2027-07-03');

      const result = await confirm(providerRef, `evt_${randomUUID()}`, amount);

      expect(result.applied).toBe(true);
      expect(result.payment.state).toBe('SUCCEEDED');
      expect(result.stayId).not.toBe('');

      const [occupancy] = await withScope(VILLA_ORG, (tx) => tx<{ state: string }[]>`
        select state from occupancies where id = ${booking.id}
      `);
      expect(occupancy!.state).toBe('COMMITTED');

      const entries = await withScope(VILLA_ORG, (tx) => tx<
        { entry_type: string; amount_centavos: string; origin: string; actor_type: string }[]
      >`
        select entry_type, amount_centavos::text, origin, actor_type
          from ledger_entries where cause_id = ${result.payment.id}
      `);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        entry_type: 'BOOKING_PREPAID',
        origin: 'ONLINE',
        actor_type: 'PROVIDER',
      });
      expect(Number(entries[0]!.amount_centavos)).toBe(amount);
    });

    it('applies a replayed event exactly once', async () => {
      // Providers retry. A double-applied payment is a refund conversation.
      const { providerRef, amount } = await started('2027-07-10', '2027-07-12');
      const eventId = `evt_${randomUUID()}`;

      const first = await confirm(providerRef, eventId, amount);
      const second = await confirm(providerRef, eventId, amount);

      expect(first.applied).toBe(true);
      expect(second.applied).toBe(false);
      expect(second.payment.id).toBe(first.payment.id);

      const entries = await withScope(VILLA_ORG, (tx) => tx<{ n: string }[]>`
        select count(*)::text as n from ledger_entries
         where cause_id = ${first.payment.id}
      `);
      expect(Number(entries[0]!.n)).toBe(1);
    });

    it('survives concurrent deliveries of the same event', async () => {
      // Retries can overlap, not just follow one another.
      const { providerRef, amount } = await started('2027-07-20', '2027-07-22');
      const eventId = `evt_${randomUUID()}`;

      const results = await Promise.allSettled([
        confirm(providerRef, eventId, amount),
        confirm(providerRef, eventId, amount),
      ]);

      const applied = results.filter(
        (r) => r.status === 'fulfilled' && r.value.applied,
      );
      expect(applied).toHaveLength(1);
    });

    it('refuses an amount that disagrees with the payment', async () => {
      // Not something to reconcile quietly later: the two sides disagree about
      // the price of a stay.
      const { providerRef, amount } = await started('2027-08-01', '2027-08-03');

      await expect(
        confirm(providerRef, `evt_${randomUUID()}`, amount - 1),
      ).rejects.toBeInstanceOf(AmountMismatchError);
    });

    it('leaves no stay behind when the amount is refused', async () => {
      const { booking, providerRef, amount } = await started('2027-08-10', '2027-08-12');

      await expect(
        confirm(providerRef, `evt_${randomUUID()}`, amount + 500),
      ).rejects.toBeInstanceOf(AmountMismatchError);

      const stays = await withScope(VILLA_ORG, (tx) => tx<{ n: string }[]>`
        select count(*)::text as n from stays where occupancy_id = ${booking.id}
      `);
      expect(Number(stays[0]!.n)).toBe(0);

      // And the hold is untouched, so the customer can try again.
      const [occupancy] = await withScope(VILLA_ORG, (tx) => tx<{ state: string }[]>`
        select state from occupancies where id = ${booking.id}
      `);
      expect(occupancy!.state).toBe('HELD');
    });

    it('still honours a payment that was started before the hold expired', async () => {
      // Nothing proactively flips a HELD row when its clock runs out — expiry
      // is a comparison at query time (findPayableBooking checks it), not a
      // state transition. A payment intent issued while the hold was live can
      // legitimately have its confirmation arrive a little late. Refusing it
      // here would be the platform taking a customer's money and then
      // deciding not to honour what it was for — worse than the mild
      // untidiness of an occupancy row that outlived its own deadline.
      const { booking, providerRef, amount } = await started('2027-09-01', '2027-09-03');
      await withScope(VILLA_ORG, (tx) => tx`
        update occupancies set expires_at = now() - interval '1 minute'
         where id = ${booking.id}
      `);

      const result = await confirm(providerRef, `evt_${randomUUID()}`, amount);

      expect(result.applied).toBe(true);
      expect(result.stayId).not.toBe('');
    });

    it('refuses a second payment attempt once the booking is already committed', async () => {
      const { booking, providerRef, amount } = await started('2027-09-10', '2027-09-12');
      await confirm(providerRef, `evt_${randomUUID()}`, amount);

      // startPayment's own WHERE state = 'HELD' is what refuses this — a
      // committed occupancy is no longer a payable hold.
      await expect(
        payments.startPayment({
          occupancyId: booking.id,
          amountCentavos: amount,
          providerRef: `sbx_${randomUUID()}`,
        }),
      ).rejects.toBeInstanceOf(BookingNotHeldError);
    });

    it('does not double-charge a second confirmation with a different event id', async () => {
      // A replay with the *same* event id is already covered above via the
      // provider_events unique constraint. This is one level further: two
      // callbacks for one payment carrying two *different* event ids — the
      // shape both a provider retrying with a fresh id and two overlapping
      // client taps would take. Before the conditional UPDATE in
      // confirmPayment existed, nothing stopped this from writing a second
      // ledger entry; this proves the UPDATE is what holds the line now, not
      // the uniqueness constraint (which a fresh event id always satisfies).
      const { booking, providerRef, amount } = await started('2027-10-20', '2027-10-22');

      const first = await confirm(providerRef, `evt_${randomUUID()}`, amount);
      const second = await confirm(providerRef, `evt_${randomUUID()}`, amount);

      expect(first.applied).toBe(true);
      expect(second.applied).toBe(false);
      expect(second.stayId).toBe(first.stayId);

      const entries = await withScope(VILLA_ORG, (tx) => tx<{ n: string }[]>`
        select count(*)::text as n from ledger_entries
         where cause_id = ${first.payment.id}
      `);
      expect(Number(entries[0]!.n)).toBe(1);

      const stays = await withScope(VILLA_ORG, (tx) => tx<{ n: string }[]>`
        select count(*)::text as n from stays where occupancy_id = ${booking.id}
      `);
      expect(Number(stays[0]!.n)).toBe(1);
    });
  });

  describe('simulating a sandbox payment', () => {
    const gateway = sandboxPaymentGateway();
    const confirmViaGateway = confirmBookingPayment(payments, gateway);
    const simulate = simulateBookingPayment(payments, gateway, confirmViaGateway);

    const heldWithPayment = async (startsOn: string, endsOn: string) => {
      const booking = await heldBooking(startsOn, endsOn);
      const payable = await payments.findPayableBooking(booking.id);
      const intent = await gateway.startPayment({
        amountCentavos: payable!.amountCentavos,
        reference: booking.id,
      });
      const payment = await payments.startPayment({
        occupancyId: booking.id,
        amountCentavos: payable!.amountCentavos,
        providerRef: intent.providerRef,
      });
      return { booking, payment };
    };

    it('confirms through the same pipeline the webhook uses', async () => {
      const { booking, payment } = await heldWithPayment('2027-09-20', '2027-09-22');

      const result = await simulate({
        occupancyId: booking.id,
        paymentId: payment.id,
        userId: GUEST,
      });

      expect(result!.applied).toBe(true);
      expect(result!.stayId).not.toBe('');
    });

    it('refuses a payment that belongs to someone else', async () => {
      const { booking, payment } = await heldWithPayment('2027-09-25', '2027-09-27');

      await expect(
        simulate({ occupancyId: booking.id, paymentId: payment.id, userId: randomUUID() }),
      ).rejects.toBeInstanceOf(PaymentNotOwnedError);
    });

    it('refuses a payment that is no longer pending', async () => {
      const { booking, payment } = await heldWithPayment('2027-10-01', '2027-10-03');
      await simulate({ occupancyId: booking.id, paymentId: payment.id, userId: GUEST });

      await expect(
        simulate({ occupancyId: booking.id, paymentId: payment.id, userId: GUEST }),
      ).rejects.toBeInstanceOf(BookingNotHeldError);
    });

    it('refuses a payment id that does not exist for that booking', async () => {
      const { booking } = await heldWithPayment('2027-10-05', '2027-10-07');

      await expect(
        simulate({ occupancyId: booking.id, paymentId: randomUUID(), userId: GUEST }),
      ).rejects.toBeInstanceOf(BookingNotHeldError);
    });

    it('refuses when the gateway has no simulation to offer', async () => {
      const { booking, payment } = await heldWithPayment('2027-10-10', '2027-10-12');
      // Omitted, not set to undefined: exactOptionalPropertyTypes treats the
      // two differently, and a real gateway simply would not have the method.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { simulateSuccess: _unused, ...noSimulationGateway } = gateway;
      const simulateWithout = simulateBookingPayment(
        payments,
        noSimulationGateway,
        confirmViaGateway,
      );

      await expect(
        simulateWithout({ occupancyId: booking.id, paymentId: payment.id, userId: GUEST }),
      ).rejects.toBeInstanceOf(SimulationUnavailableError);
    });
  });

  describe('the receipt', () => {
    it('shows the guest what they actually paid', async () => {
      // The failure this guards: `payments` is organization-isolated and a
      // guest is not a member, so the receipt renders the stay correctly and
      // the amount as zero — confidently wrong about money.
      const booking = await hold({
        heldBy: GUEST,
        resourceId: BED,
        startsOn: '2027-12-01',
        endsOn: '2027-12-04',
      });
      const payable = await payments.findPayableBooking(booking.id);
      const providerRef = `sbx_${randomUUID()}`;
      await payments.startPayment({
        occupancyId: booking.id,
        amountCentavos: payable!.amountCentavos,
        providerRef,
      });
      await payments.confirmPayment({
        providerEventId: `evt_${randomUUID()}`,
        provider: 'sandbox',
        providerRef,
        amountCentavos: payable!.amountCentavos,
        occurredAt: new Date(),
        rawPayload: '{}',
      });

      const stays = await users.staysFor(GUEST);
      const stay = stays.find((s) => s.startsOn === '2027-12-01');

      expect(stay).toBeDefined();
      expect(stay!.nights).toBe(3);
      expect(stay!.paidCentavos).toBe(payable!.amountCentavos);
      expect(stay!.paidCentavos).toBeGreaterThan(0);
      expect(stay!.paidAt).toBeInstanceOf(Date);
      expect(stay!.reference).toMatch(/^[0-9A-F]{8}$/);
    });

    it('shows one guest nothing of another\'s', async () => {
      const other = randomUUID();
      expect(await users.staysFor(other)).toEqual([]);
    });
  });

  describe('the ledger', () => {
    it('refuses an update, even from the application role', async () => {
      await expect(
        withScope(VILLA_ORG, (tx) => tx`
          update ledger_entries set amount_centavos = 1
        `),
      ).rejects.toThrow(/append-only|permission denied/);
    });

    it('refuses a delete', async () => {
      await expect(
        withScope(VILLA_ORG, (tx) => tx`delete from ledger_entries`),
      ).rejects.toThrow(/append-only|permission denied/);
    });

    it('never stores a negative amount', async () => {
      // Direction is expressed by entry type, not by sign.
      await expect(
        withScope(VILLA_ORG, (tx) => tx`
          insert into ledger_entries (
            organization_id, entry_type, amount_centavos, origin,
            actor_type, cause_type, cause_id, occurred_at
          ) values (
            ${VILLA_ORG}, 'REFUND_ISSUED', -100, 'ONLINE',
            'PROVIDER', 'PAYMENT', ${randomUUID()}, now()
          )
        `),
      ).rejects.toThrow();
    });
  });
});
