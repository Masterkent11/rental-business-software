import { describe, expect, it } from 'vitest';
import {
  assessDuplicate,
  normalizeAddress,
  splitCanonicalChanges,
  unitDesignators,
  type CanonicalPropertyFacts,
  type DuplicateCandidate,
} from '@/domain/listings/listing.ts';

const house: CanonicalPropertyFacts = {
  name: 'Talamban Family House',
  addressLine: '8 Sunrise Drive, Pit-os Road',
  areaLabel: 'Brgy. Talamban',
  cityLabel: 'Cebu City',
  propertyType: 'HOUSE',
  location: { latitude: 10.3591, longitude: 123.9112 },
  bedrooms: 4,
  bathrooms: 3,
  floorAreaSqm: 220,
  lotAreaSqm: 300,
};

const candidate = (overrides: Partial<DuplicateCandidate> = {}): DuplicateCandidate => ({
  ...house,
  listingId: 'listing-a',
  organizationId: 'org-a',
  ...overrides,
});

describe('canonical property duplicate detection', () => {
  it('normalizes abbreviations, punctuation and case', () => {
    expect(normalizeAddress('8 Sunrise Dr., Pit-os Rd')).toBe(normalizeAddress('8 SUNRISE DRIVE pit os road'));
    expect(unitDesignators('Tower 2, Unit #12A')).toEqual({ tower: '2', unit: '12a' });
  });

  it('flags the same address, unit and characteristics as a strong duplicate', () => {
    const result = assessDuplicate({ ...house, addressLine: '8 Sunrise Dr, Pit-os Rd' }, [candidate()]);
    expect(result).toEqual({ kind: 'STRONG', listingId: 'listing-a' });
  });

  it('treats different units in the same building as distinct properties', () => {
    const condo = { ...house, propertyType: 'CONDO', addressLine: 'Unit 12A, Tower 2, Salinas Drive' };
    const neighbour = candidate({ propertyType: 'CONDO', addressLine: 'Unit 12B, Tower 2, Salinas Drive' });
    expect(assessDuplicate(condo, [neighbour])).toEqual({ kind: 'DISTINCT' });
  });

  it('sends a nearby look-alike with a differently written address to manual review', () => {
    const result = assessDuplicate({ ...house, addressLine: 'Lot 8 Sunrise' }, [
      candidate({ location: { latitude: 10.35911, longitude: 123.91121 } }),
    ]);
    expect(result).toEqual({ kind: 'POSSIBLE', listingId: 'listing-a' });
  });

  it('does not match properties whose characteristics differ', () => {
    expect(assessDuplicate(house, [candidate({ bedrooms: 2 })])).toEqual({ kind: 'DISTINCT' });
    expect(assessDuplicate(house, [candidate({ floorAreaSqm: 300 })])).toEqual({ kind: 'DISTINCT' });
  });

  it('is deterministic across candidate order', () => {
    const a = candidate({ listingId: 'b-listing' });
    const b = candidate({ listingId: 'a-listing' });
    expect(assessDuplicate(house, [a, b])).toEqual(assessDuplicate(house, [b, a]));
  });
});

describe('canonical fact protection', () => {
  it('separates canonical facts from marketing copy', () => {
    const split = splitCanonicalChanges(
      { title: 'New title', bedrooms: 5, floorAreaSqm: 240, description: undefined },
      { name: 'Renamed', addressLine: '9 Sunrise Drive' },
    );
    expect(split.direct).toEqual({ listing: { title: 'New title' }, property: { name: 'Renamed' } });
    expect(split.canonical).toEqual({
      listing: { bedrooms: 5, floorAreaSqm: 240 },
      property: { addressLine: '9 Sunrise Drive' },
    });
  });

  it('reports no proposal when only marketing fields change', () => {
    expect(splitCanonicalChanges({ title: 'Only a title' }, undefined).canonical).toBeNull();
  });
});
