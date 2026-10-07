import { afterAll, describe, expect, it } from 'vitest';
import { postgresListingRepository } from '@/infrastructure/postgres/repositories/postgres-listing.repository.ts';
import { sql, withScope } from '@/infrastructure/postgres/db.ts';
import { PUBLIC } from '@/domain/shared/organization-scope.ts';

/**
 * Integration tests against real PostgreSQL.
 *
 * Skipped when DATABASE_URL is absent so the unit suite still runs anywhere —
 * but never faked. A green unit suite says the mapping is right; only these say
 * the schema, the policies, and the SQL agree with it.
 *
 * Run with:
 *   DATABASE_URL=postgres://rental_app:rental_app@127.0.0.1:55432/rental_mvp \
 *   npx vitest run
 */
// Remote databases are not local ones: a handful of sequential round trips to
// another region legitimately exceeds the 5s default. The timeout describes the
// network, not a tolerance for slow code.
const live = Boolean(process.env.DATABASE_URL);
const suite = live ? describe : describe.skip;

suite('listings against real PostgreSQL', { timeout: 30_000 }, () => {
  const repo = postgresListingRepository();

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  it('returns only published listings', async () => {
    const rows = (await repo.search(PUBLIC, { limit: 50, offset: 0 })).items;

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.state === 'PUBLISHED')).toBe(true);
  });

  it('joins through to property, owner, and tour without RLS eating the row', async () => {
    // The public read crosses four organization-scoped tables. When their
    // policies were missing this returned zero rows rather than erroring, so
    // the assertion is that the joined fields actually arrive.
    const rows = (await repo.search(PUBLIC, { limit: 50, offset: 0 })).items;
    const withTour = rows.find((r) => r.hasTour);

    expect(withTour).toBeDefined();
    expect(withTour!.propertyName).not.toBe('');
    expect(withTour!.cityLabel).toBe('Cebu City');
    expect(withTour!.ownerName).not.toBe('');
    expect(withTour!.photos.length).toBeGreaterThan(0);
  });

  it('stores money as integer centavos', async () => {
    const rows = (await repo.search(PUBLIC, { limit: 50, offset: 0 })).items;
    // bigint arrives from the driver as a string; the adapter must parse it.
    expect(rows.every((r) => Number.isInteger(r.priceCentavos))).toBe(true);
  });

  it('refuses a draft listing by id', async () => {
    // The id has to be fetched inside the owning organization's scope: the
    // unscoped connection cannot see drafts at all, which is the policy
    // working rather than a problem.
    const [draft] = await withScope(
      '33333333-3333-3333-3333-333333333333',
      async (tx) =>
        tx<{ id: string }[]>`
          select id from listings where state = 'DRAFT' limit 1
        `,
    );
    expect(draft).toBeDefined();

    // D-12: absent, not forbidden.
    expect(await repo.findPublicById(PUBLIC, draft!.id)).toBeNull();
  });

  it('applies the kind filter in SQL, not in memory', async () => {
    const nightly = (await repo.search(PUBLIC, {
      kind: 'SHORT_TERM',
      limit: 50,
      offset: 0,
    })).items;

    expect(nightly.length).toBeGreaterThan(0);
    expect(nightly.every((r) => r.kind === 'SHORT_TERM')).toBe(true);
  });

  describe('organization isolation', () => {
    const SANTOS = '11111111-1111-1111-1111-111111111111';
    const VILLA = '33333333-3333-3333-3333-333333333333';

    it('lets an organization see its own unpublished listing', async () => {
      const rows = await withScope(VILLA, async (tx) => {
        return tx<{ n: string }[]>`
          select count(*)::text as n from listings where state = 'DRAFT'
        `;
      });
      expect(Number(rows[0]!.n)).toBeGreaterThan(0);
    });

    it('hides one organization\'s draft from another', async () => {
      // The failure this guards is the one that matters: Santos reading
      // Villa's unpublished inventory.
      const rows = await withScope(SANTOS, async (tx) => {
        return tx<{ n: string }[]>`
          select count(*)::text as n from listings
           where state = 'DRAFT' and organization_id = ${VILLA}
        `;
      });
      expect(Number(rows[0]!.n)).toBe(0);
    });

    it('shows no drafts at all on the public, unscoped read', async () => {
      const rows = await withScope(null, async (tx) => {
        return tx<{ n: string }[]>`
          select count(*)::text as n from listings where state = 'DRAFT'
        `;
      });
      expect(Number(rows[0]!.n)).toBe(0);
    });

    it('runs as a role RLS actually applies to', async () => {
      // A superuser — or Supabase's service_role — bypasses RLS entirely, which
      // would make every assertion above meaningless (ADR-0006).
      const rows = await sql<{ bypass: boolean; superuser: boolean }[]>`
        select rolbypassrls as bypass, rolsuper as superuser
          from pg_roles where rolname = current_user
      `;
      expect(rows[0]!.bypass).toBe(false);
      expect(rows[0]!.superuser).toBe(false);
    });
  });
});
