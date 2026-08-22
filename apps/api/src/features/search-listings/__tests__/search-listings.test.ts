import { describe, expect, it } from 'vitest';
import { searchListings, viewListing } from '../search-listings.ts';
import type { Listing } from '../../../domain/listings/listing.ts';
import type { ListingRepository } from '../../../application/ports/listing-repository.ts';
import { centavos } from '../../../domain/shared/money.ts';
import type { OrganizationId } from '../../../domain/shared/organization-scope.ts';

const listing = (over: Partial<Listing> = {}): Listing => ({
  id: 'l-1',
  organizationId: 'org-1' as OrganizationId,
  resourceId: 'r-1',
  kind: 'LONG_TERM',
  resourceType: 'UNIT',
  title: 'One-bedroom corner unit',
  description: '',
  propertyName: 'ABC Apartment',
  areaLabel: 'Brgy. Kamputhaw',
  cityLabel: 'Cebu City',
  priceCentavos: centavos(850_000),
  state: 'PUBLISHED',
  hasTour: true,
  sceneCount: 5,
  photos: [],
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

/** A repository that has forgotten to filter — the failure being guarded. */
const leakyRepo = (rows: Listing[]): ListingRepository => ({
  search: async () => rows,
  findPublicById: async (_s, id) => rows.find((r) => r.id === id) ?? null,
});

describe('searchListings', () => {
  it('returns published listings', async () => {
    const search = searchListings(leakyRepo([listing()]));
    const found = await search({ limit: 20, offset: 0 });
    expect(found).toHaveLength(1);
  });

  it('never returns a listing that is not published, even if the repository does', async () => {
    // D-12: no customer may see an unapproved listing. The use case enforces
    // it too, so a future adapter that forgets cannot leak a draft.
    const rows = [
      listing({ id: 'draft', state: 'DRAFT' }),
      listing({ id: 'pending', state: 'PENDING_APPROVAL' }),
      listing({ id: 'live', state: 'PUBLISHED' }),
    ];
    const search = searchListings(leakyRepo(rows));
    const found = await search({ limit: 20, offset: 0 });

    expect(found.map((l) => l.id)).toEqual(['live']);
  });

  it('treats an unpublished listing as absent, not forbidden', async () => {
    const view = viewListing(leakyRepo([listing({ id: 'draft', state: 'DRAFT' })]));
    expect(await view('draft')).toBeNull();
  });
});

describe('money', () => {
  it('refuses anything that is not whole centavos', () => {
    // P-06. A rate that arrives as 8500.5 is a bug, not a rounding decision.
    expect(() => centavos(8500.5)).toThrow(RangeError);
    expect(() => centavos(-1)).toThrow(RangeError);
    expect(centavos(850_000)).toBe(850_000);
  });
});
