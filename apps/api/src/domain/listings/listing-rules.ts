import type { Listing } from './listing.ts';
import type {
  ListingKind,
  ListingLifecycleAction,
  ListingState,
  PropertyType,
  ResourceType,
  SaleStatus,
} from './listing-state.ts';
import { SALE_PROPERTY_TYPES, SALE_STATUSES } from './listing-state.ts';
import {
  InvalidListingDetailsError,
  InvalidListingTransitionError,
  ListingNotPublishableError,
  ListingPhotoRejectedError,
} from './listing-errors.ts';

export const MAX_LISTING_PHOTOS = 12;
export const MIN_LISTING_PHOTOS_TO_PUBLISH = 1;
export const LISTING_PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_LISTING_PHOTO_BYTES = 10 * 1024 * 1024;

export const MAX_FLOOR_PLANS = 6;
export const MAX_SALE_PRICE_CENTAVOS = 10_000_000_000_00;

export const isPublic = (listing: Listing): boolean =>
  listing.state === 'PUBLISHED';

export const isSale = (listing: Pick<Listing, 'intent'>): boolean => listing.intent === 'SALE';

export function publicPriceCentavos(listing: Pick<Listing, 'intent' | 'priceCentavos'>): number | null {
  return listing.intent === 'SALE' ? null : listing.priceCentavos;
}

export function resourceTypeForProperty(propertyType: PropertyType): ResourceType {
  switch (propertyType) {
    case 'ROOM':
      return 'ROOM';
    case 'BOARDING_HOUSE':
      return 'BED_SPACE';
    default:
      return 'UNIT';
  }
}

export function listingKindsForRentalMode(
  rentalMode: 'LONG_TERM' | 'SHORT_TERM' | 'HYBRID',
): readonly ListingKind[] {
  if (rentalMode === 'HYBRID') return ['SHORT_TERM', 'LONG_TERM'];
  return [rentalMode];
}

export interface SaleDetailsInput {
  readonly title: string;
  readonly description: string;
  readonly propertyType: PropertyType;
  readonly saleStatus: SaleStatus;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly floorAreaSqm: number | null;
  readonly lotAreaSqm: number | null;
  readonly parkingSlots: number;
}

export function assertValidSaleDetails(input: SaleDetailsInput): void {
  if (input.title.trim().length < 3) {
    throw new InvalidListingDetailsError('Give the listing a title of at least 3 characters');
  }
  if (!SALE_PROPERTY_TYPES.includes(input.propertyType)) {
    throw new InvalidListingDetailsError('Choose house & lot, condo, townhouse, lot, or commercial');
  }
  if (!SALE_STATUSES.includes(input.saleStatus)) {
    throw new InvalidListingDetailsError('Choose whether the property is ready, pre-selling, or under construction');
  }
  if (!Number.isInteger(input.bedrooms) || input.bedrooms < 0 || input.bedrooms > 50) {
    throw new InvalidListingDetailsError('Bedrooms must be between 0 and 50');
  }
  if (!Number.isInteger(input.bathrooms) || input.bathrooms < 0 || input.bathrooms > 50) {
    throw new InvalidListingDetailsError('Bathrooms must be between 0 and 50');
  }
  if (!Number.isInteger(input.parkingSlots) || input.parkingSlots < 0 || input.parkingSlots > 50) {
    throw new InvalidListingDetailsError('Parking slots must be between 0 and 50');
  }
  if (input.floorAreaSqm !== null && (!Number.isInteger(input.floorAreaSqm) || input.floorAreaSqm <= 0)) {
    throw new InvalidListingDetailsError('Floor area must be a whole number of square metres');
  }
  if (input.lotAreaSqm !== null && (!Number.isInteger(input.lotAreaSqm) || input.lotAreaSqm <= 0)) {
    throw new InvalidListingDetailsError('Lot area must be a whole number of square metres');
  }
  if (input.propertyType === 'LOT' && input.lotAreaSqm === null) {
    throw new InvalidListingDetailsError('A lot needs its lot area');
  }
  if (input.propertyType !== 'LOT' && input.floorAreaSqm === null) {
    throw new InvalidListingDetailsError('Add the floor area');
  }
}

export function assertValidInternalPrice(centavosValue: number | null): void {
  if (centavosValue === null) return;
  if (!Number.isInteger(centavosValue) || centavosValue <= 0 || centavosValue > MAX_SALE_PRICE_CENTAVOS) {
    throw new InvalidListingDetailsError('The internal asking price must be a positive amount');
  }
}

export function normaliseFloorPlanLabel(raw: string): string {
  const label = raw.replace(/\s+/g, ' ').trim();
  if (label.length < 2 || label.length > 60) {
    throw new ListingPhotoRejectedError('Name the floor plan, for example “Ground floor”');
  }
  return label;
}

export function assertMayAddFloorPlan(currentCount: number): void {
  if (currentCount >= MAX_FLOOR_PLANS) {
    throw new ListingPhotoRejectedError(`A listing can have at most ${MAX_FLOOR_PLANS} floor plans`);
  }
}

export interface ListingDetailsInput {
  readonly kind: ListingKind;
  readonly title: string;
  readonly priceCentavos: number;
  readonly minStayNights: number | null;
  readonly maxOccupants: number;
  readonly advanceMonths: number;
  readonly depositMonths: number;
  readonly cleaningFeeCentavos: number;
}

export function assertValidListingDetails(input: ListingDetailsInput): void {
  if (input.title.trim().length < 3) {
    throw new InvalidListingDetailsError('Give the listing a title of at least 3 characters');
  }
  if (!Number.isInteger(input.priceCentavos) || input.priceCentavos <= 0) {
    throw new InvalidListingDetailsError('Set a price greater than zero');
  }
  if (!Number.isInteger(input.maxOccupants) || input.maxOccupants < 1) {
    throw new InvalidListingDetailsError('Occupancy must allow at least one person');
  }
  if (input.kind === 'SHORT_TERM') {
    if (input.minStayNights === null || input.minStayNights < 1 || input.minStayNights > 90) {
      throw new InvalidListingDetailsError('Short stays need a minimum of 1 to 90 nights');
    }
    if (input.advanceMonths !== 0 || input.depositMonths !== 0) {
      throw new InvalidListingDetailsError('Short stays do not take advance or deposit months');
    }
  } else {
    if (input.minStayNights !== null) {
      throw new InvalidListingDetailsError('Monthly rentals do not have a minimum night count');
    }
    if (input.cleaningFeeCentavos !== 0) {
      throw new InvalidListingDetailsError('Monthly rentals do not charge a cleaning fee');
    }
    if (input.advanceMonths > 6 || input.depositMonths > 6) {
      throw new InvalidListingDetailsError('Advance and deposit are limited to 6 months each');
    }
  }
}

export function publishProblems(
  listing: Listing,
  organizationVerified: boolean,
): readonly string[] {
  const problems: string[] = [];
  if (!organizationVerified) problems.push('the organization is not verified yet');
  if (listing.title.trim().length < 3) problems.push('add a title');
  if (listing.description.trim().length < 20) problems.push('write a description of at least 20 characters');
  if (listing.intent === 'RENT' && listing.priceCentavos <= 0) problems.push('set a price');
  if (listing.intent === 'SALE' && !listing.location) problems.push('set the property location on the map');
  if (listing.intent === 'SALE' && !listing.saleStatus) problems.push('choose the sale status');
  if (listing.photos.length < MIN_LISTING_PHOTOS_TO_PUBLISH) problems.push('upload at least one photo');
  if (listing.areaLabel.trim().length === 0 || listing.cityLabel.trim().length === 0) {
    problems.push('add the barangay and city');
  }
  if (listing.kind === 'SHORT_TERM' && (listing.minStayNights ?? 0) < 1) {
    problems.push('set a minimum stay');
  }
  return problems;
}

export function assertPublishable(listing: Listing, organizationVerified: boolean): void {
  const problems = publishProblems(listing, organizationVerified);
  if (problems.length > 0) throw new ListingNotPublishableError(problems);
}

const TRANSITIONS: Record<ListingLifecycleAction, { from: readonly ListingState[]; to: ListingState }> = {
  PUBLISH: { from: ['DRAFT', 'UNPUBLISHED', 'APPROVED'], to: 'PUBLISHED' },
  UNPUBLISH: { from: ['PUBLISHED'], to: 'UNPUBLISHED' },
  ARCHIVE: { from: ['DRAFT', 'UNPUBLISHED', 'REJECTED'], to: 'ARCHIVED' },
};

export function nextListingState(
  current: ListingState,
  action: ListingLifecycleAction,
): ListingState {
  const rule = TRANSITIONS[action];
  if (!rule.from.includes(current)) {
    const hint = action === 'ARCHIVE' && current === 'PUBLISHED'
      ? ' Unpublish it first.'
      : '';
    throw new InvalidListingTransitionError(
      `A ${current.toLowerCase()} listing cannot be ${action.toLowerCase()}ed.${hint}`,
    );
  }
  return rule.to;
}

export function canEditKind(state: ListingState): boolean {
  return state === 'DRAFT';
}

export function assertAcceptablePhoto(input: {
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly currentCount: number;
}): void {
  if (!(LISTING_PHOTO_CONTENT_TYPES as readonly string[]).includes(input.contentType)) {
    throw new ListingPhotoRejectedError('Photos must be JPEG, PNG, or WebP');
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_LISTING_PHOTO_BYTES) {
    throw new ListingPhotoRejectedError('Photos must be smaller than 10 MB');
  }
  if (input.currentCount >= MAX_LISTING_PHOTOS) {
    throw new ListingPhotoRejectedError(`A listing can have at most ${MAX_LISTING_PHOTOS} photos`);
  }
}

export function listingPhotoPathPrefix(organizationId: string, listingId: string): string {
  return `${organizationId}/listings/${listingId}/`;
}

export function assertPhotoPathBelongs(
  storagePath: string,
  organizationId: string,
  listingId: string,
): void {
  const prefix = listingPhotoPathPrefix(organizationId, listingId);
  const rest = storagePath.startsWith(prefix) ? storagePath.slice(prefix.length) : '';
  if (!rest || rest.includes('/') || rest.includes('..') || !/^[A-Za-z0-9._-]+$/.test(rest)) {
    throw new ListingPhotoRejectedError('That photo was not uploaded for this listing');
  }
}
