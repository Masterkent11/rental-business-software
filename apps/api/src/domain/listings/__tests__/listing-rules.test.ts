import { describe, expect, it } from 'vitest';
import {
  InvalidListingDetailsError,
  InvalidListingTransitionError,
  ListingPhotoRejectedError,
  assertAcceptablePhoto,
  assertPhotoPathBelongs,
  assertValidInternalPrice,
  assertValidListingDetails,
  assertValidSaleDetails,
  nextListingState,
  publicPriceCentavos,
  publishProblems,
  resourceTypeForProperty,
  type Listing,
} from '@/domain/listings/listing.ts';
import { centavos } from '@/domain/shared/money.ts';
import type { OrganizationId } from '@/domain/shared/organization-scope.ts';

const listing = (over: Partial<Listing> = {}): Listing => ({
  id: 'l-1',
  organizationId: 'org-1' as OrganizationId,
  resourceId: 'r-1',
  intent: 'RENT',
  kind: 'SHORT_TERM',
  resourceType: 'UNIT',
  title: 'Bright studio',
  description: 'A bright studio with a balcony and fast Wi-Fi.',
  propertyName: 'Studio',
  areaLabel: 'Lahug',
  cityLabel: 'Cebu City',
  priceCentavos: centavos(200_000),
  state: 'DRAFT',
  hasTour: false,
  sceneCount: 0,
  photos: ['https://example.test/a.jpg'],
  amenities: [],
  houseRules: [],
  terms: [],
  minStayNights: 1,
  advanceMonths: 0,
  depositMonths: 0,
  sharedFacilities: [],
  ownerName: 'Owner',
  ownerVerified: true,
  ...over,
});

const details = {
  kind: 'SHORT_TERM' as const,
  title: 'Studio',
  priceCentavos: 100_000,
  minStayNights: 1,
  maxOccupants: 2,
  advanceMonths: 0,
  depositMonths: 0,
  cleaningFeeCentavos: 0,
};

describe('listing rules', () => {
  it('maps property types to the rentable resource they create', () => {
    expect(resourceTypeForProperty('CONDO')).toBe('UNIT');
    expect(resourceTypeForProperty('ROOM')).toBe('ROOM');
    expect(resourceTypeForProperty('BOARDING_HOUSE')).toBe('BED_SPACE');
  });

  it('validates details per rental mode', () => {
    expect(() => assertValidListingDetails(details)).not.toThrow();
    expect(() => assertValidListingDetails({ ...details, priceCentavos: 0 })).toThrow(InvalidListingDetailsError);
    expect(() => assertValidListingDetails({ ...details, minStayNights: null })).toThrow(InvalidListingDetailsError);
    expect(() => assertValidListingDetails({ ...details, kind: 'LONG_TERM', minStayNights: null, cleaningFeeCentavos: 100 })).toThrow(
      InvalidListingDetailsError,
    );
    expect(() => assertValidListingDetails({ ...details, kind: 'LONG_TERM', minStayNights: null, advanceMonths: 1, depositMonths: 2 })).not.toThrow();
  });

  it('lists what stops a listing from being published', () => {
    expect(publishProblems(listing(), true)).toEqual([]);
    expect(publishProblems(listing({ photos: [] }), true)).toContain('upload at least one photo');
    expect(publishProblems(listing(), false)).toContain('the organization is not verified yet');
    expect(publishProblems(listing({ description: 'short' }), true).length).toBe(1);
  });

  it('allows only meaningful lifecycle transitions', () => {
    expect(nextListingState('DRAFT', 'PUBLISH')).toBe('PUBLISHED');
    expect(nextListingState('PUBLISHED', 'UNPUBLISH')).toBe('UNPUBLISHED');
    expect(nextListingState('UNPUBLISHED', 'ARCHIVE')).toBe('ARCHIVED');
    expect(() => nextListingState('PUBLISHED', 'ARCHIVE')).toThrow(InvalidListingTransitionError);
    expect(() => nextListingState('ARCHIVED', 'PUBLISH')).toThrow(InvalidListingTransitionError);
  });

  it('accepts only photos uploaded under the listing prefix', () => {
    expect(() => assertPhotoPathBelongs('org/listings/l-1/a.jpg', 'org', 'l-1')).not.toThrow();
    expect(() => assertPhotoPathBelongs('org/listings/l-2/a.jpg', 'org', 'l-1')).toThrow(ListingPhotoRejectedError);
    expect(() => assertPhotoPathBelongs('org/listings/l-1/../x.jpg', 'org', 'l-1')).toThrow(ListingPhotoRejectedError);
    expect(() => assertPhotoPathBelongs('other/listings/l-1/a.jpg', 'org', 'l-1')).toThrow(ListingPhotoRejectedError);
  });

  it('rejects unsupported, oversized, or excess photos', () => {
    expect(() => assertAcceptablePhoto({ contentType: 'image/gif', sizeBytes: 10, currentCount: 0 })).toThrow();
    expect(() => assertAcceptablePhoto({ contentType: 'image/jpeg', sizeBytes: 11 * 1024 * 1024, currentCount: 0 })).toThrow();
    expect(() => assertAcceptablePhoto({ contentType: 'image/webp', sizeBytes: 10, currentCount: 12 })).toThrow();
    expect(() => assertAcceptablePhoto({ contentType: 'image/png', sizeBytes: 10, currentCount: 3 })).not.toThrow();
  });
});

describe('sale listings', () => {
  const sale = {
    title: 'Modern house and lot',
    description: 'Two-storey home in Talamban.',
    propertyType: 'HOUSE' as const,
    saleStatus: 'READY_FOR_OCCUPANCY' as const,
    bedrooms: 4,
    bathrooms: 3,
    floorAreaSqm: 220,
    lotAreaSqm: 300,
    parkingSlots: 2,
  };

  it('accepts a complete sale listing and rejects rental-only property types', () => {
    expect(() => assertValidSaleDetails(sale)).not.toThrow();
    expect(() => assertValidSaleDetails({ ...sale, propertyType: 'BOARDING_HOUSE' })).toThrow(InvalidListingDetailsError);
  });

  it('a lot needs a lot area, a building needs a floor area', () => {
    expect(() => assertValidSaleDetails({ ...sale, propertyType: 'LOT', lotAreaSqm: null })).toThrow(InvalidListingDetailsError);
    expect(() => assertValidSaleDetails({ ...sale, floorAreaSqm: null })).toThrow(InvalidListingDetailsError);
  });

  it('never exposes a public price for a sale', () => {
    expect(publicPriceCentavos({ intent: 'SALE', priceCentavos: centavos(1_850_000_000) })).toBeNull();
    expect(publicPriceCentavos({ intent: 'RENT', priceCentavos: centavos(250_000) })).toBe(250_000);
  });

  it('a sale is publishable without a price but not without a location', () => {
    const base = listing({ intent: 'SALE', kind: null, priceCentavos: centavos(0), saleStatus: 'READY_FOR_OCCUPANCY' });
    expect(publishProblems(base, true)).toContain('set the property location on the map');
    const located = listing({
      intent: 'SALE',
      kind: null,
      priceCentavos: centavos(0),
      saleStatus: 'READY_FOR_OCCUPANCY',
      location: { latitude: 10.35, longitude: 123.91, privacy: 'APPROXIMATE' },
    });
    expect(publishProblems(located, true)).toEqual([]);
  });

  it('validates the internal asking price', () => {
    expect(() => assertValidInternalPrice(0)).toThrow(InvalidListingDetailsError);
    expect(() => assertValidInternalPrice(null)).not.toThrow();
  });
});
