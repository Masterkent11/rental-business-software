import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { postgresOccupancyRepository } from '@/infrastructure/postgres/repositories/postgres-occupancy.repository.ts';
import { sql, withScope } from '@/infrastructure/postgres/db.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import {
  NotBookableError,
  OccupancyConflictError,
  SerializationError,
} from '@/application/ports/repositories/occupancy-repository.port.ts';
import { dateRange } from '@/domain/occupancy/occupancy.ts';
import { placeHold } from '@/application/bookings/place-hold/place-hold.use-case.ts';

/**
 * I-01 against real PostgreSQL.
 *
 * These are the tests the architecture exists to pass. A double-booking that
 * only appears under load is the failure every mechanism in ADR-0005 was
 * chosen to prevent, so it is tested with genuine concurrent transactions
 * rather than a simulation of them.
 */
const live = Boolean(process.env.DATABASE_URL);
const suite = live ? describe : describe.skip;

// The Villa tree: Room 101 with Bed A nested inside it.
const ROOM = 'b3333333-0000-0000-0000-000000000001';
const GUEST = '99999999-9999-4999-8999-999999999999';

const BED = 'b3333333-0000-0000-0000-000000000002';
// A separate tree entirely, also bookable nightly.
const CONDO = 'b2222222-0000-0000-0000-000000000001';
// Long-term only — not bookable by the night.
const UNIT = 'b1111111-0000-0000-0000-000000000001';
const VILLA_ORG = '33333333-3333-3333-3333-333333333333';
const SKYLINE_ORG = '22222222-2222-2222-2222-222222222222';
const SANTOS_ORG = '11111111-1111-1111-1111-111111111111';

suite('occupancy against real PostgreSQL', { timeout: 30_000 }, () => {
  const occupancies = postgresOccupancyRepository();
  const hold = placeHold(occupancies);

  /**
   * Reset by **cancelling**, not deleting, and in one transaction.
   *
   * Nothing in the product deletes an occupancy — it releases one — so the
   * application role holds no DELETE here and the tests work within the same
   * permissions the running service has. A cancelled row stops occupying while
   * staying on the timeline, which is the real behaviour.
   *
   * One transaction rather than one per organization: six round trips to a
   * database in another region overran vitest's 10s hook budget, which
   * presented as a mysterious "Hook timed out" rather than as the latency it
   * actually was.
   */
  const reset = async () => {
    await sql.begin(async (tx) => {
      for (const organizationId of [VILLA_ORG, SKYLINE_ORG, SANTOS_ORG]) {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;
        await tx`
          update occupancies set state = 'CANCELLED'
           where state in ('HELD', 'COMMITTED')
        `;
        await tx`delete from resource_night_status`;
      }
    });
  };

  /**
   * The guest exists because the suite makes it exist.
   *
   * Depending on a profile someone seeded by hand means the tests pass on one
   * machine and fail on the next — which is exactly what happened the first
   * time this ran against the hosted database.
   */
  const ensureGuest = async () => {
    await postgresUserRepository().createProfile({
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

  it('holds nights that are free', async () => {
    const result = await hold({
      resourceId: BED,
      startsOn: '2026-12-01',
      endsOn: '2026-12-04',
      heldBy: GUEST,
    });

    expect(result.state).toBe('HELD');
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it('refuses the same nights twice', async () => {
    await hold({ heldBy: GUEST, resourceId: BED, startsOn: '2026-12-01', endsOn: '2026-12-04' });

    await expect(
      hold({ heldBy: GUEST, resourceId: BED, startsOn: '2026-12-02', endsOn: '2026-12-03' }),
    ).rejects.toBeInstanceOf(OccupancyConflictError);
  });

  it('lets a checkout and a check-in share a day', async () => {
    await hold({ heldBy: GUEST, resourceId: BED, startsOn: '2026-12-01', endsOn: '2026-12-10' });

    const next = await hold({
      heldBy: GUEST,
      resourceId: BED,
      startsOn: '2026-12-10',
      endsOn: '2026-12-12',
    });

    expect(next.state).toBe('HELD');
  });

  describe('the nesting rule', () => {
    it('blocks a bed inside a leased room', async () => {
      // The failure this prevents: a boarding house leases the whole room to a
      // family, and the platform sells a bunk inside it to a student.
      await withScope(VILLA_ORG, (tx) => tx`
        insert into occupancies (
          organization_id, resource_id, root_id, subtree, during, kind, state
        )
        select ${VILLA_ORG}, r.id, r.root_id, r.subtree,
               daterange('2026-12-01','2026-12-20','[)'), 'LEASE', 'COMMITTED'
          from rentable_resources r where r.id = ${ROOM}
      `);

      await expect(
        hold({ heldBy: GUEST, resourceId: BED, startsOn: '2026-12-05', endsOn: '2026-12-07' }),
      ).rejects.toBeInstanceOf(OccupancyConflictError);
    });

    it('blocks the room while a bed inside it is held', async () => {
      // The same in reverse: occupying a child occupies its ancestors. A lease
      // is a direct write (leases arrive in Sprint 4), so this asserts the
      // constraint itself rather than the booking path.
      await hold({ heldBy: GUEST, resourceId: BED, startsOn: '2026-12-05', endsOn: '2026-12-07' });

      await expect(
        withScope(VILLA_ORG, (tx) => tx`
          insert into occupancies (
            organization_id, resource_id, root_id, subtree, during, kind, state
          )
          select ${VILLA_ORG}, r.id, r.root_id, r.subtree,
                 daterange('2026-12-01','2026-12-20','[)'), 'LEASE', 'COMMITTED'
            from rentable_resources r where r.id = ${ROOM}
        `),
      ).rejects.toThrow(/exclusion constraint/);
    });

    it('leaves a different tree alone', async () => {
      // Santos's unit has nothing to do with Villa's room.
      await hold({ heldBy: GUEST, resourceId: BED, startsOn: '2026-12-01', endsOn: '2026-12-10' });

      const other = await hold({
        heldBy: GUEST,
        resourceId: CONDO,
        startsOn: '2026-12-01',
        endsOn: '2026-12-10',
      });

      expect(other.state).toBe('HELD');
    });
  });

  it('refuses a resource with no published nightly listing', async () => {
    // Unit 203 is let by the month only. A booking attempt must not become a
    // way to reserve — or to discover — inventory that is not on the market.
    await expect(
      hold({ heldBy: GUEST, resourceId: UNIT, startsOn: '2026-12-01', endsOn: '2026-12-04' }),
    ).rejects.toBeInstanceOf(NotBookableError);
  });

  describe('expired holds', () => {
    it('do not keep nights off the market', async () => {
      await withScope(VILLA_ORG, (tx) => tx`
        insert into occupancies (
          organization_id, resource_id, root_id, subtree,
          during, kind, state, expires_at
        )
        select ${VILLA_ORG}, r.id, r.root_id, r.subtree,
               daterange('2026-12-01','2026-12-04','[)'), 'BOOKING', 'HELD',
               now() - interval '1 minute'
          from rentable_resources r where r.id = ${BED}
      `);

      // Swept inside the booking transaction, so an abandoned checkout does
      // not hold inventory hostage.
      const result = await hold({
        heldBy: GUEST,
        resourceId: BED,
        startsOn: '2026-12-01',
        endsOn: '2026-12-04',
      });

      expect(result.state).toBe('HELD');
    });

    it('do not show as taken on the calendar', async () => {
      await withScope(VILLA_ORG, (tx) => tx`
        insert into occupancies (
          organization_id, resource_id, root_id, subtree,
          during, kind, state, expires_at
        )
        select ${VILLA_ORG}, r.id, r.root_id, r.subtree,
               daterange('2026-12-01','2026-12-04','[)'), 'BOOKING', 'HELD',
               now() - interval '1 minute'
          from rentable_resources r where r.id = ${BED}
      `);

      const nights = await occupancies.nightsFor(
        BED,
        dateRange('2026-12-01', '2026-12-04'),
      );

      expect(nights.every((n) => n.status === 'OPEN')).toBe(true);
    });
  });

  describe('the calendar', () => {
    it('reports a held night as taken and the rest as open', async () => {
      await hold({ heldBy: GUEST, resourceId: BED, startsOn: '2026-12-02', endsOn: '2026-12-04' });

      const nights = await occupancies.nightsFor(
        BED,
        dateRange('2026-12-01', '2026-12-05'),
      );

      expect(nights.map((n) => `${n.night}:${n.status}`)).toEqual([
        '2026-12-01:OPEN',
        '2026-12-02:BOOKED',
        '2026-12-03:BOOKED',
        '2026-12-04:OPEN',
      ]);
    });

    it('shows a lease on the ancestor as taken on the bed', async () => {
      // The calendar answers "can I stay here", which a lease upstairs settles.
      await withScope(VILLA_ORG, (tx) => tx`
        insert into occupancies (
          organization_id, resource_id, root_id, subtree, during, kind, state
        )
        select ${VILLA_ORG}, r.id, r.root_id, r.subtree,
               daterange('2026-12-01','2026-12-05','[)'), 'LEASE', 'COMMITTED'
          from rentable_resources r where r.id = ${ROOM}
      `);

      const nights = await occupancies.nightsFor(
        BED,
        dateRange('2026-12-01', '2026-12-03'),
      );

      expect(nights.every((n) => n.status === 'LEASED')).toBe(true);
    });
  });

  describe('story 3.5 — two phones, same nights, same second', () => {
    it('gives the nights to exactly one of them', async () => {
      // The demo, as a test. Not staggered, not mocked: two real transactions
      // racing for the same bunk.
      const attempt = () =>
        hold({ heldBy: GUEST, resourceId: BED, startsOn: '2026-12-24', endsOn: '2026-12-27' });

      const results = await Promise.allSettled([attempt(), attempt()]);

      const won = results.filter((r) => r.status === 'fulfilled');
      const lost = results.filter((r) => r.status === 'rejected');

      expect(won).toHaveLength(1);
      expect(lost).toHaveLength(1);

      // And the loser is told at request time, not left waiting.
      const reason = (lost[0] as PromiseRejectedResult).reason;
      expect(
        reason instanceof OccupancyConflictError ||
          reason instanceof SerializationError,
      ).toBe(true);

      const rows = await sql<{ n: string }[]>`
        select count(*)::text as n from occupancies
         where state in ('HELD','COMMITTED')
      `;
      expect(Number(rows[0]!.n)).toBe(1);
    });

    it('survives eight of them at once', async () => {
      // Under real contention the advisory lock should make these queue rather
      // than collide, so most losers get a clean conflict rather than a
      // serialization failure.
      const attempts = Array.from({ length: 8 }, () =>
        hold({ heldBy: GUEST, resourceId: BED, startsOn: '2026-12-30', endsOn: '2027-01-02' }),
      );

      const results = await Promise.allSettled(attempts);
      const won = results.filter((r) => r.status === 'fulfilled');

      expect(won).toHaveLength(1);

      const rows = await sql<{ n: string }[]>`
        select count(*)::text as n from occupancies
         where state in ('HELD','COMMITTED')
      `;
      expect(Number(rows[0]!.n)).toBe(1);
    });

    it('lets contenders for different nights all through', async () => {
      // Serialization must not become a queue for unrelated work.
      const results = await Promise.allSettled([
        hold({ heldBy: GUEST, resourceId: BED, startsOn: '2027-01-05', endsOn: '2027-01-07' }),
        hold({ heldBy: GUEST, resourceId: BED, startsOn: '2027-01-10', endsOn: '2027-01-12' }),
        hold({ heldBy: GUEST, resourceId: BED, startsOn: '2027-01-15', endsOn: '2027-01-17' }),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    });
  });
});
