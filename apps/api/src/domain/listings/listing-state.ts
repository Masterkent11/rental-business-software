export type ListingState =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED';

export type ListingKind = 'LONG_TERM' | 'SHORT_TERM';

export type ListingIntent = 'RENT' | 'SALE';

export const LISTING_INTENTS: readonly ListingIntent[] = ['RENT', 'SALE'];

export type SaleStatus = 'READY_FOR_OCCUPANCY' | 'PRE_SELLING' | 'UNDER_CONSTRUCTION';

export const SALE_STATUSES: readonly SaleStatus[] = ['READY_FOR_OCCUPANCY', 'PRE_SELLING', 'UNDER_CONSTRUCTION'];

export type ResourceType =
  | 'UNIT'
  | 'ROOM'
  | 'BED_SPACE'
  | 'PARKING'
  | 'STORAGE';

export type PropertyType =
  | 'APARTMENT'
  | 'CONDO'
  | 'HOUSE'
  | 'ROOM'
  | 'BOARDING_HOUSE'
  | 'TOWNHOUSE'
  | 'LOT'
  | 'COMMERCIAL';

export const PROPERTY_TYPES: readonly PropertyType[] = [
  'APARTMENT',
  'CONDO',
  'HOUSE',
  'ROOM',
  'BOARDING_HOUSE',
  'TOWNHOUSE',
  'LOT',
  'COMMERCIAL',
];

export const RENTAL_PROPERTY_TYPES: readonly PropertyType[] = ['APARTMENT', 'CONDO', 'HOUSE', 'ROOM', 'BOARDING_HOUSE'];

export const SALE_PROPERTY_TYPES: readonly PropertyType[] = ['HOUSE', 'CONDO', 'TOWNHOUSE', 'LOT', 'COMMERCIAL'];

export type ListingSort = 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC' | 'DISTANCE';

export type Furnishing = 'FURNISHED' | 'SEMI_FURNISHED' | 'UNFURNISHED';

export const FURNISHING_VALUES: readonly Furnishing[] = ['FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED'];

export type ListingLifecycleAction = 'PUBLISH' | 'UNPUBLISH' | 'ARCHIVE';
