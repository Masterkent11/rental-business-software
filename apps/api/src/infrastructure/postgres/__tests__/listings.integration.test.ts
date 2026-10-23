import { reorderListingPhotos } from '@/application/listings/reorder-listing-photos/reorder-listing-photos.use-case.ts';
import { ListingPhotoRejectedError } from '@/domain/listings/listing-errors.ts';
import { randomUUID } from 'node:crypto';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { setListingState } from '@/application/listings/set-listing-state/set-listing-state.use-case.ts';
import { centavos } from '@/domain/shared/money.ts';
import postgres from 'postgres';
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

  const draftListing = () => repo.createPropertyListing({
    organizationId: '11111111-1111-1111-1111-111111111111',
    property: { name: 'Concurrency fixture', propertyType: 'APARTMENT', addressLine: '1 Test Street', areaLabel: 'Test', cityLabel: 'Cebu City' },
    resource: { label: 'Unit', resourceType: 'UNIT', rentalMode: 'LONG_TERM' },
    listing: { kind: 'LONG_TERM', title: 'Concurrency fixture', description: 'A listing for concurrent policy tests.',
      priceCentavos: centavos(100000), amenities: [], houseRules: [], terms: [], minStayNights: null,
      advanceMonths: 0, depositMonths: 0, maxOccupants: 2, bedrooms: 1, bathrooms: 1,
      floorAreaSqm: 30, cleaningFeeCentavos: centavos(0), availableFrom: null },
  });

  it('does not apply two lifecycle decisions based on the same draft state', async () => {
    const listing = await draftListing();
    await repo.addPhoto(listing.organizationId, listing.id, { storagePath: `${listing.organizationId}/listings/${listing.id}/front.jpg`,
      url: 'https://storage.test/front.jpg', contentType: 'image/jpeg', sizeBytes: 1000 });
    const input = { principal: { userId: 'test-owner', displayName: 'Owner', organizationId: listing.organizationId,
      capabilities: [{ capability: 'OWNER' as const, organizationId: listing.organizationId }] }, organizationId: listing.organizationId, listingId: listing.id };
    let reads = 0;
    let release!: () => void;
    const ready = new Promise<void>(resolve => { release = resolve; });
    const contenders = { ...repo, findById: async (organizationId: string, id: string) => {
      const snapshot = await repo.findById(organizationId, id);
      if (++reads === 2) release();
      await ready;
      return snapshot;
    } };
    const results = await Promise.allSettled([
      setListingState(contenders)({ ...input, action: 'ARCHIVE' }),
      setListingState(contenders)({ ...input, action: 'PUBLISH' }),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  });

  it('rejects a photo ordering that repeats an identifier', async () => {
    const listing = await draftListing();
    const photos = await Promise.all([0, 1].map(index => repo.addPhoto(listing.organizationId, listing.id, {
      storagePath: `${listing.organizationId}/listings/${listing.id}/${index}.jpg`,
      url: `https://storage.test/${index}.jpg`, contentType: 'image/jpeg', sizeBytes: 1000,
    })));
    await expect(reorderListingPhotos(repo)({ principal: { userId: 'test-owner', displayName: 'Owner', organizationId: listing.organizationId,
      capabilities: [{ capability: 'OWNER', organizationId: listing.organizationId }] }, organizationId: listing.organizationId,
      listingId: listing.id, photoIds: [photos[0]!.id, photos[0]!.id, photos[1]!.id] })).rejects.toBeInstanceOf(ListingPhotoRejectedError);
    expect((await repo.findById(listing.organizationId, listing.id))!.media!.map(photo => photo.position)).toEqual([0, 1]);
  });

  it.each(['PHOTO', 'FLOOR_PLAN'] as const)('enforces the %s limit when two uploads race for the last slot', async kind => {
    const listing = await draftListing();
    const maximum = kind === 'PHOTO' ? 12 : 6;
    const add = (index: number) => {
      const media = { storagePath: `${listing.organizationId}/listings/${listing.id}/${index}.jpg`,
        url: `https://storage.test/${listing.id}/${index}.jpg`, contentType: 'image/jpeg', sizeBytes: 1000 };
      return kind === 'PHOTO' ? repo.addPhoto(listing.organizationId, listing.id, media)
        : repo.addFloorPlan(listing.organizationId, listing.id, media, 'Ground floor');
    };
    for (let index = 0; index < maximum - 1; index++) await add(index);
    const results = await Promise.allSettled([add(maximum), add(maximum + 1)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const refreshed = await repo.findById(listing.organizationId, listing.id);
    expect(kind === 'PHOTO' ? refreshed!.photos.length : refreshed!.floorPlans!.length).toBe(maximum);
  });

  it('returns real owner activity and isolates view-event reads by organization', async () => {
    const admin = postgres(process.env.TEST_ADMIN_DATABASE_URL!);
    const organizationId = '11111111-1111-1111-1111-111111111111';
    const otherOrganizationId = '33333333-3333-3333-3333-333333333333';
    const [listing] = await repo.forOrganization(organizationId);
    expect(listing).toBeDefined();
    const userId = randomUUID();
    await postgresUserRepository().createProfile({ id: userId, email: 'listing-viewer@example.test', mobile: null });
    const [event] = await admin<{ id: string }[]>`insert into listing_view_events(user_id, listing_id) values (${userId}, ${listing!.id}) returning id::text`;
    try {
      const own = await withScope(organizationId, tx => tx`select id from listing_view_events where id = ${event!.id}`);
      const other = await withScope(otherOrganizationId, tx => tx`select id from listing_view_events where id = ${event!.id}`);
      const publicRows = await withScope(null, tx => tx`select id from listing_view_events where id = ${event!.id}`);
      expect(own).toHaveLength(1);
      expect(other).toHaveLength(0);
      expect(publicRows).toHaveLength(0);
      const refreshed = (await repo.forOrganization(organizationId)).find(row => row.id === listing!.id)!;
      expect(refreshed.activity!.views).toBeGreaterThanOrEqual(1);
      expect(refreshed.activity!.inquiries).toBeGreaterThanOrEqual(0);
      expect(refreshed.activity!.viewings).toBeGreaterThanOrEqual(0);
    } finally {
      await admin`delete from listing_view_events where id = ${event!.id}`;
      await admin.end();
    }
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
