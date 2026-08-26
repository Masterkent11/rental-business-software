import type { Centavos } from '../shared/money.ts';
import type { OrganizationId } from '../shared/organization-scope.ts';

/**
 * The public marketplace representation of a rentable resource.
 *
 * A listing points at a resource; it is not the resource (glossary.md). A
 * HYBRID resource carries two listings — one monthly, one nightly — which is
 * exactly why the separation exists: they are priced, worded, and unpublished
 * independently.
 */

export type ListingKind = 'LONG_TERM' | 'SHORT_TERM';

export type ResourceType =
  | 'UNIT'
  | 'ROOM'
  | 'BED_SPACE'
  | 'PARKING'
  | 'STORAGE';

export type ListingState =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED';

export interface Listing {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly resourceId: string;
  readonly kind: ListingKind;
  readonly resourceType: ResourceType;
  readonly title: string;
  readonly description: string;
  readonly propertyName: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly priceCentavos: Centavos;
  readonly state: ListingState;
  readonly hasTour: boolean;
  readonly sceneCount: number;
  readonly photos: readonly string[];
  /** Owner-authored content for the detail screen. */
  readonly amenities: readonly string[];
  readonly houseRules: readonly string[];
  readonly terms: readonly string[];
  /** Short-term only; null for a monthly listing. */
  readonly minStayNights: number | null;
  /** Long-term only; 0 for a nightly listing. Multipliers on the monthly rent. */
  readonly advanceMonths: number;
  readonly depositMonths: number;
  /** For a bed space this is the whole question. Empty for a whole unit. */
  readonly sharedFacilities: readonly string[];
  /** The organization behind the listing. Verification gates publishing (D-11). */
  readonly ownerName: string;
  readonly ownerVerified: boolean;
}

/**
 * Only a published listing is public.
 *
 * Expressed here rather than as a `WHERE` clause someone remembers to write,
 * because "a customer must never see an unapproved listing" (D-12) is a domain
 * rule, not a query detail.
 */
export const isPublic = (listing: Listing): boolean =>
  listing.state === 'PUBLISHED';

/**
 * What a customer may narrow a search by.
 *
 * Note what is absent: **dates and occupancy**. Whether a resource is free on
 * given nights is a question about one occupancy timeline (U-01), answered by
 * the availability projection — not by filtering listings. Putting dates here
 * would invite exactly the second source of truth the domain model refuses.
 */
export interface ListingQuery {
  readonly text?: string;
  /**
   * Fetch a specific set — what the saved-listings screen needs.
   *
   * One request rather than one per favourite: a customer with a dozen saved
   * places on mobile data should not pay twelve round trips to see them.
   * Still published-only, so unsaving is not required for a delisted place to
   * disappear.
   */
  readonly ids?: readonly string[];
  readonly kind?: ListingKind;
  readonly resourceType?: ResourceType;
  readonly maxPriceCentavos?: Centavos;
  readonly hasTour?: boolean;
  readonly limit: number;
  readonly offset: number;
}
