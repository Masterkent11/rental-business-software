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
