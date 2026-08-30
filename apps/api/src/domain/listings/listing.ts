import type { Centavos } from '@/domain/shared/money.ts';
import type { OrganizationId } from '@/domain/shared/organization-scope.ts';
import type { ListingKind, ResourceType, ListingState } from './listing-state.ts';

export * from './listing-state.ts';
export * from './listing-rules.ts';
export * from './listing-errors.ts';

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

export interface ListingQuery {
  readonly text?: string;
  readonly ids?: readonly string[];
  readonly kind?: ListingKind;
  readonly resourceType?: ResourceType;
  readonly maxPriceCentavos?: Centavos;
  readonly hasTour?: boolean;
  readonly limit: number;
  readonly offset: number;
}
