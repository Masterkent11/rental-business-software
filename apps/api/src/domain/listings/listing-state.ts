export type ListingState =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED';

export type ListingKind = 'LONG_TERM' | 'SHORT_TERM';

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
  | 'BOARDING_HOUSE';

export const PROPERTY_TYPES: readonly PropertyType[] = [
  'APARTMENT',
  'CONDO',
  'HOUSE',
  'ROOM',
  'BOARDING_HOUSE',
];

export type ListingSort = 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC';

export type ListingLifecycleAction = 'PUBLISH' | 'UNPUBLISH' | 'ARCHIVE';
