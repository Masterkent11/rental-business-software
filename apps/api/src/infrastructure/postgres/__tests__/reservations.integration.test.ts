import { randomUUID } from 'node:crypto';
import { amountDue } from '@/application/payments/start-booking-payment/start-booking-payment.use-case.ts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { postgresApplicationRepository } from '@/infrastructure/postgres/repositories/postgres-application.repository.ts';
import { postgresPaymentRepository } from '@/infrastructure/postgres/repositories/postgres-payment.repository.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { sql, withScope } from '@/infrastructure/postgres/db.ts';
import {
  AlreadyReservedError,
  ReservationNotOfferedError,
} from '@/application/ports/repositories/application-repository.port.ts';

const live = Boolean(process.env.DATABASE_URL);
const suite = live ? describe : describe.skip;

/** Santos's unit — the one listing that offers a reservation fee (PHP 2,000). */
const UNIT = 'b1111111-0000-0000-0000-000000000001';
/** Santos's parking slot — no fee set, so no reservation offered. */
const PARKING = 'b1111111-0000-0000-0000-000000000002';
const SANTOS_ORG = '11111111-1111-1111-1111-111111111111';
const FEE = 200_000;

const APPLICANT = '77777777-7777-4777-8777-777777777777';
const OWNER = '88888888-8888-4888-8888-888888888888';

suite('reservations against real PostgreSQL', { timeout: 30_000 }, () => {
  const applications = postgresApplicationRepository();
  const payments = postgresPaymentRepository();
  const users = postgresUserRepository();

  beforeAll(async () => {
    for (const [id, email] of [
      [APPLICANT, 'applicant@example.test'],
      [OWNER, 'owner@example.test'],
    ] as const) {
      await users.createProfile({ id, email, mobile: null });
    }
  });

  const reset = async () => {
    await sql.begin(async (tx) => {
      await tx`select set_config('app.organization_id', ${SANTOS_ORG}, true)`;
      // Release any occupancy these tests placed, so the exclusion constraint
      // does not carry state between cases.
      await tx`
        update occupancies set state = 'RELEASED'
         where kind = 'RESERVATION' and state in ('HELD','COMMITTED')
      `;
      await tx`
        update reservations set state = 'EXPIRED', resolved_at = now()
         where state in ('PENDING_PAYMENT','ACTIVE')
      `;
      await tx`
        update applications set state = 'WITHDRAWN'
         where applicant_id = ${APPLICANT}
           and state in ('SUBMITTED','UNDER_REVIEW')
      `;
    });
  };

  beforeEach(reset);
  afterAll(async () => {
    await reset();
    await sql.end({ timeout: 5 });
  });

  const applyFor = (resourceId = UNIT) =>
    applications.submit({
      resourceId,
      applicantId: APPLICANT,
      desiredMoveIn: '2029-04-01',
      desiredTermMonths: 12,
      message: '',
    });

  const reserveAndPay = async () => {
    const application = await applyFor();
    const reservation = await applications.reserve({
      applicantId: APPLICANT,
      applicationId: application.id,
      holdMinutes: 60,
    });

    const providerRef = `sbx_${randomUUID()}`;
    await payments.startPayment({
      occupancyId: reservation.occupancyId!,
      amountCentavos: reservation.feeCentavos,
      providerRef,
    });
    await payments.confirmPayment({
      providerEventId: `evt_${randomUUID()}`,
      provider: 'sandbox',
      providerRef,
      amountCentavos: reservation.feeCentavos,
      occurredAt: new Date(),
      rawPayload: '{}',
    });

    return { application, reservation };
  };

  const reservationState = async (applicationId: string) => {
    const rows = await withScope(SANTOS_ORG, (tx) => tx<{ state: string }[]>`
      select state from reservations where application_id = ${applicationId}
    `);
    return rows[0]?.state;
  };

  const occupancyState = async (occupancyId: string) => {
    const rows = await withScope(SANTOS_ORG, (tx) => tx<{ state: string }[]>`
      select state from occupancies where id = ${occupancyId}
    `);
    return rows[0]?.state;
  };

  const ledgerFor = async (reservationId: string) =>
    withScope(SANTOS_ORG, (tx) => tx<{ entry_type: string; amount_centavos: string }[]>`
      select entry_type, amount_centavos::text
        from ledger_entries
       where cause_type = 'RESERVATION' and cause_id = ${reservationId}
       order by recorded_at
    `);

  it('refuses a reservation where the owner offers none', async () => {
    // Opt-in. Inventing a fee would be the platform pricing the owner's
    // inventory and then forfeiting it on their behalf.
    const application = await applyFor(PARKING);

    await expect(
      applications.reserve({
        applicantId: APPLICANT,
        applicationId: application.id,
        holdMinutes: 60,
      }),
    ).rejects.toBeInstanceOf(ReservationNotOfferedError);
  });

  it('places a hold covering the tenancy asked for', async () => {
    const application = await applyFor();
    const reservation = await applications.reserve({
      applicantId: APPLICANT,
      applicationId: application.id,
      holdMinutes: 60,
    });

    expect(reservation.feeCentavos).toBe(FEE);
    expect(reservation.state).toBe('PENDING_PAYMENT');

    const rows = await withScope(SANTOS_ORG, (tx) => tx<
      { kind: string; state: string; starts: string; ends: string }[]
    >`
      select kind, state,
             to_char(lower(during), 'YYYY-MM-DD') as starts,
             to_char(upper(during), 'YYYY-MM-DD') as ends
        from occupancies where id = ${reservation.occupancyId}
    `);

    expect(rows[0]).toMatchObject({ kind: 'RESERVATION', state: 'HELD' });
    // A reservation that blocked only a token day would not reserve anything.
    expect(rows[0]!.starts).toBe('2029-04-01');
    expect(rows[0]!.ends).toBe('2030-04-01');
  });

  it('refuses a second live reservation on one application', async () => {
    const application = await applyFor();
    await applications.reserve({
      applicantId: APPLICANT,
      applicationId: application.id,
      holdMinutes: 60,
    });

    await expect(
      applications.reserve({
        applicantId: APPLICANT,
        applicationId: application.id,
        holdMinutes: 60,
      }),
    ).rejects.toBeInstanceOf(AlreadyReservedError);
  });

  it('becomes active on payment, and creates no stay', async () => {
    // A paid reservation is not a confirmed stay: nobody is staying anywhere,
    // and the owner has not decided.
    const { application, reservation } = await reserveAndPay();

    expect(await reservationState(application.id)).toBe('ACTIVE');
    expect(await occupancyState(reservation.occupancyId!)).toBe('HELD');

    const stays = await withScope(SANTOS_ORG, (tx) => tx<{ n: string }[]>`
      select count(*)::text as n from stays
       where occupancy_id = ${reservation.occupancyId}
    `);
    expect(Number(stays[0]!.n)).toBe(0);
  });

  describe('the three outcomes', () => {
    it('credits the fee on approval and keeps the place', async () => {
      const { application, reservation } = await reserveAndPay();

      await applications.decide({
        organizationId: SANTOS_ORG,
        applicationId: application.id,
        deciderId: OWNER,
        next: 'APPROVED',
        reason: null,
      });

      expect(await reservationState(application.id)).toBe('CREDITED');
      // Approved means the place is theirs; the hold becomes real occupancy
      // until a lease replaces it.
      expect(await occupancyState(reservation.occupancyId!)).toBe('COMMITTED');

      const entries = await ledgerFor(reservation.id);
      expect(entries.map((e) => e.entry_type)).toContain(
        'RESERVATION_FEE_CREDITED',
      );
      expect(Number(entries.at(-1)!.amount_centavos)).toBe(FEE);
    });

    it('refunds the fee on rejection and releases the place', async () => {
      // The customer did nothing wrong and must not be out of pocket, and the
      // place must go back on the market.
      const { application, reservation } = await reserveAndPay();

      await applications.decide({
        organizationId: SANTOS_ORG,
        applicationId: application.id,
        deciderId: OWNER,
        next: 'REJECTED',
        reason: 'Let to an earlier applicant',
      });

      expect(await reservationState(application.id)).toBe('REFUNDED');
      expect(await occupancyState(reservation.occupancyId!)).toBe('RELEASED');

      const entries = await ledgerFor(reservation.id);
      expect(entries.map((e) => e.entry_type)).toContain('REFUND_ISSUED');
    });

    it('forfeits the fee on withdrawal and releases the place', async () => {
      // The resource was held off the market for this person; the owner
      // carried that cost.
      const { application, reservation } = await reserveAndPay();

      await applications.withdraw(APPLICANT, application.id);

      expect(await reservationState(application.id)).toBe('FORFEITED');
      expect(await occupancyState(reservation.occupancyId!)).toBe('RELEASED');

      const entries = await ledgerFor(reservation.id);
      expect(entries.map((e) => e.entry_type)).toContain(
        'RESERVATION_FEE_FORFEITED',
      );
    });

    it('leaves an unpaid reservation with nothing to settle, and frees the place', async () => {
      // No money arrived, so nothing to credit, refund, or forfeit — but the
      // hold must still go, or the resource stays off the market for a
      // reservation that is already over.
      const application = await applyFor();
      const reservation = await applications.reserve({
        applicantId: APPLICANT,
        applicationId: application.id,
        holdMinutes: 60,
      });

      await applications.withdraw(APPLICANT, application.id);

      expect(await reservationState(application.id)).toBe('EXPIRED');
      expect(await occupancyState(reservation.occupancyId!)).toBe('RELEASED');
    });

    it('prices an unpaid reservation for payment', async () => {
      // The regression this guards: `reservations` is organization-isolated, so
      // an unscoped read matched nothing and a payable fee looked like an
      // expired hold — a 404 on the customer's way to paying.
      const application = await applyFor();
      const reservation = await applications.reserve({
        applicantId: APPLICANT,
        applicationId: application.id,
        holdMinutes: 60,
      });

      const payable = await payments.findPayableBooking(reservation.occupancyId!);

      expect(payable).not.toBeNull();
      expect(amountDue(payable!).amountCentavos).toBe(FEE);
      // Not priced by nights: a reservation fee is the owner's number.
      expect(amountDue(payable!).nights).toBe(0);
    });

    it('records the outcome once, not on every read', async () => {
      const { application, reservation } = await reserveAndPay();

      await applications.decide({
        organizationId: SANTOS_ORG,
        applicationId: application.id,
        deciderId: OWNER,
        next: 'APPROVED',
        reason: null,
      });
      // A second settle attempt must be a no-op: the ledger is append-only, so
      // a duplicate entry could never be removed.
      await applications.resolveReservation({
        applicationId: application.id,
        outcome: 'CREDITED',
      });

      const entries = await ledgerFor(reservation.id);
      const credits = entries.filter(
        (e) => e.entry_type === 'RESERVATION_FEE_CREDITED',
      );
      expect(credits).toHaveLength(1);
    });
  });
});
