import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { SearchListingsController } from '@/modules/listings/controllers/search-listings.controller.ts';
import { ViewListingController } from '@/modules/listings/controllers/view-listing.controller.ts';
import { searchListings } from '@/application/listings/search-listings/search-listings.use-case.ts';
import { viewListing } from '@/application/listings/view-listing/view-listing.use-case.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { Listing } from '@/domain/listings/listing.ts';
import { centavos } from '@/domain/shared/money.ts';
import type { OrganizationId } from '@/domain/shared/organization-scope.ts';

const listing = (over: Partial<Listing> = {}): Listing => ({
  id: '11111111-1111-1111-1111-111111111111',
  organizationId: 'org-1' as OrganizationId,
  resourceId: 'r-1',
  kind: 'LONG_TERM',
  resourceType: 'UNIT',
  title: 'One-bedroom corner unit',
  description: 'Corner unit with cross-ventilation.',
  propertyName: 'ABC Apartment',
  areaLabel: 'Brgy. Kamputhaw',
  cityLabel: 'Cebu City',
  priceCentavos: centavos(850_000),
  state: 'PUBLISHED',
  hasTour: true,
  sceneCount: 5,
  photos: ['https://example.test/a.jpg'],
  amenities: ['Inverter aircon'],
  houseRules: ['No pets'],
  terms: ['12-month minimum term'],
  minStayNights: null,
  advanceMonths: 1,
  depositMonths: 2,
  sharedFacilities: [],
  ownerName: 'Santos Property Holdings',
  ownerVerified: true,
  ...over,
});

const repo = (rows: Listing[]): ListingRepository => ({
  search: async (_scope, query) => {
    let out = rows.filter((r) => r.state === 'PUBLISHED');
    if (query.ids) out = out.filter((r) => query.ids!.includes(r.id));
    if (query.kind) out = out.filter((r) => r.kind === query.kind);
    if (query.hasTour) out = out.filter((r) => r.hasTour);
    if (query.maxPriceCentavos !== undefined) {
      out = out.filter((r) => r.priceCentavos <= query.maxPriceCentavos!);
    }
    return out;
  },
  findPublicById: async (_scope, id) =>
    rows.find((r) => r.id === id && r.state === 'PUBLISHED') ?? null,
  forOrganization: async () => rows,
  findById: async (_orgId, id) => rows.find((r) => r.id === id) ?? null,
  createListing: async () => rows[0]!,
  addPhoto: async () => {},
  setListingState: async () => rows[0] ?? null,
  listResources: async () => [],
});

const searchControllerFor = (rows: Listing[]) => {
  const r = repo(rows);
  return new SearchListingsController(searchListings(r));
};

const viewControllerFor = (rows: Listing[]) => {
  const r = repo(rows);
  return new ViewListingController(viewListing(r));
};

describe('GET /listings', () => {
  it('returns published listings in the documented shape', async () => {
    const body = await searchControllerFor([listing()]).list({});
    expect(body).toHaveProperty('items');

    const item = (body as { items: Record<string, unknown>[] }).items[0]!;
    expect(Number.isInteger(item.priceCentavos)).toBe(true);
    expect(item.priceCentavos).toBe(850_000);
    expect(item.currency).toBe('PHP');
    expect(typeof item.availabilityLabel).toBe('string');
    expect(item.resourceId).toBe('r-1');
    expect(typeof item.isAvailable).toBe('boolean');
  });

  it('never returns a draft listing', async () => {
    const body = await searchControllerFor([
      listing({ id: '22222222-2222-2222-2222-222222222222', state: 'DRAFT' }),
      listing(),
    ]).list({});

    const ids = (body as { items: { id: string }[] }).items.map((i) => i.id);
    expect(ids).toEqual(['11111111-1111-1111-1111-111111111111']);
  });

  it('refuses an unknown filter value rather than ignoring it', async () => {
    const body = await searchControllerFor([listing()]).list({ kind: 'WEEKLY' });
    expect((body as { statusCode?: number }).statusCode).toBe(400);
  });

  it('refuses a limit beyond the documented maximum', async () => {
    const body = await searchControllerFor([listing()]).list({ limit: '500' });
    expect((body as { statusCode?: number }).statusCode).toBe(400);
  });

  it('applies the kind filter', async () => {
    const body = await searchControllerFor([
      listing(),
      listing({
        id: '33333333-3333-3333-3333-333333333333',
        kind: 'SHORT_TERM',
      }),
    ]).list({ kind: 'SHORT_TERM' });

    const items = (body as { items: { kind: string }[] }).items;
    expect(items).toHaveLength(1);
    expect(items[0]!.kind).toBe('SHORT_TERM');
  });

  it('computes move-in cost server-side, never leaving it to a client', async () => {
    const body = await searchControllerFor([listing()]).list({});
    const item = (body as { items: Record<string, unknown>[] }).items[0]!;
    const cost = item.moveInCost as { totalCentavos: number; lines: unknown[] };

    expect(cost.totalCentavos).toBe(3_400_000);
    expect(cost.lines).toHaveLength(3);
  });

  it('has no move-in cost for a nightly listing', async () => {
    const body = await searchControllerFor([
      listing({ kind: 'SHORT_TERM', advanceMonths: 0, depositMonths: 0 }),
    ]).list({});
    const item = (body as { items: Record<string, unknown>[] }).items[0]!;

    expect(item.moveInCost).toBeNull();
  });

  it('fetches a specific set by id, for saved listings', async () => {
    const other = '55555555-5555-4555-8555-555555555555';
    const body = await searchControllerFor([
      listing(),
      listing({ id: other, title: 'Another place' }),
    ]).list({ ids: `${other}` });

    const items = (body as { items: { id: string }[] }).items;
    expect(items).toHaveLength(1);
    expect(items[0]!.id).toBe(other);
  });

  it('refuses an unbounded id set', async () => {
    const many = Array.from({ length: 51 }, () => '55555555-5555-4555-8555-555555555555').join(',');
    const body = await searchControllerFor([listing()]).list({ ids: many });
    expect((body as { statusCode?: number }).statusCode).toBe(400);
  });

  it('still hides a draft even when asked for by id', async () => {
    const draftId = '66666666-6666-4666-8666-666666666666';
    const body = await searchControllerFor([
      listing({ id: draftId, state: 'DRAFT' }),
    ]).list({ ids: draftId });

    expect((body as { items: unknown[] }).items).toEqual([]);
  });

  it('defaults limit and offset when absent', async () => {
    const body = await searchControllerFor([listing()]).list({});
    expect(body).toMatchObject({ limit: 20, offset: 0 });
  });
});

describe('GET /listings/:id', () => {
  it('returns the detail fields the listing screen needs', async () => {
    const body = await viewControllerFor([listing()]).byId(
      '11111111-1111-1111-1111-111111111111',
    );

    expect(body.amenities).toEqual(['Inverter aircon']);
    expect(body.houseRules).toEqual(['No pets']);
    expect(body.ownerName).toBe('Santos Property Holdings');
    expect(body.ownerVerified).toBe(true);
  });

  it('treats an unpublished listing as not found, never forbidden', async () => {
    const controller = viewControllerFor([
      listing({ id: '44444444-4444-4444-4444-444444444444', state: 'DRAFT' }),
    ]);

    await expect(
      controller.byId('44444444-4444-4444-4444-444444444444'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('accepts any UUID PostgreSQL would store, not just RFC 4122 v4', async () => {
    const id = 'c1111111-0000-0000-0000-000000000001';
    const body = await viewControllerFor([listing({ id })]).byId(id);
    expect(body.id).toBe(id);
  });

  it('refuses a malformed id as not found rather than failing', async () => {
    await expect(
      viewControllerFor([listing()]).byId('not-a-uuid'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
