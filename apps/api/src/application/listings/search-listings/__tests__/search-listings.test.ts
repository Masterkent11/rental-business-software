import { describe, expect, it } from 'vitest';
import { searchListings } from '@/application/listings/search-listings/search-listings.use-case.ts';
import { viewListing } from '@/application/listings/view-listing/view-listing.use-case.ts';
import type { Listing } from '@/domain/listings/listing.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import { centavos } from '@/domain/shared/money.ts';
import type { OrganizationId } from '@/domain/shared/organization-scope.ts';

const listing = (over: Partial<Listing> = {}): Listing => ({
  id: 'l-1',
  organizationId: 'org-1' as OrganizationId,
  resourceId: 'r-1',
  intent: 'RENT',
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

const leakyRepo = (rows: Listing[]): ListingRepository => ({
  search: async () => ({ items: rows, total: rows.length }),
  findPublicById: async (_s, id) => rows.find((r) => r.id === id) ?? null,
  forOrganization: async () => rows,
  findById: async (_orgId, id) => rows.find((r) => r.id === id) ?? null,
  createListing: async () => rows[0]!,
  createPropertyListing: async () => rows[0]!,
  updateListing: async () => rows[0] ?? null,
  addPhoto: async () => ({ id: 'p-1', url: 'u', storagePath: null, position: 0 }),
  removePhoto: async () => null,
  reorderPhotos: async () => {},
  setListingState: async () => rows[0] ?? null,
  isOrganizationVerified: async () => true,
  listResources: async () => [],
  listProperties: async () => [],
  stayPricing: async () => null,
  createSaleListing: async () => rows[0]!,
  updateSaleListing: async () => rows[0] ?? null,
  saleTerms: async () => null,
  saveSaleTerms: async () => ({
    listingId: 'l-1',
    askingPriceInternalCentavos: null,
    priceNegotiable: true,
    commercialNotes: '',
    updatedAt: null,
  }),
  areas: async () => [],
  addFloorPlan: async () => ({ id: 'f-1', url: 'u', storagePath: null, position: 0, label: 'Ground floor' }),
  removeFloorPlan: async () => null,
  findRepresented: async () => null,
});

describe('searchListings', () => {
  it('returns published listings', async () => {
    const search = searchListings(leakyRepo([listing()]));
    const found = await search({ limit: 20, offset: 0 });
    expect(found.items).toHaveLength(1);
  });

  it('never returns a listing that is not published, even if the repository does', async () => {
    const rows = [
      listing({ id: 'draft', state: 'DRAFT' }),
      listing({ id: 'pending', state: 'PENDING_APPROVAL' }),
      listing({ id: 'live', state: 'PUBLISHED' }),
    ];
    const search = searchListings(leakyRepo(rows));
    const found = await search({ limit: 20, offset: 0 });

    expect(found.items.map((l) => l.id)).toEqual(['live']);
    expect(found.total).toBe(1);
  });

  it('treats an unpublished listing as absent, not forbidden', async () => {
    const view = viewListing(leakyRepo([listing({ id: 'draft', state: 'DRAFT' })]));
    expect(await view('draft')).toBeNull();
  });
});

describe('money', () => {
  it('refuses anything that is not whole centavos', () => {
    expect(() => centavos(8500.5)).toThrow(RangeError);
    expect(() => centavos(-1)).toThrow(RangeError);
    expect(centavos(850_000)).toBe(850_000);
  });
});
