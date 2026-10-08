import type { Centavos } from '@/domain/shared/money.ts';
import type { OrganizationId } from '@/domain/shared/organization-scope.ts';
import type { Coordinates, LocationPrivacy } from '@/domain/shared/geo.ts';
import type {
  ListingIntent,
  ListingKind,
  ListingSort,
  ListingState,
  PropertyType,
  ResourceType,
  SaleStatus,
} from './listing-state.ts';

export * from './listing-state.ts';
export * from './listing-rules.ts';
export * from './listing-errors.ts';

export interface ListingPhoto {
  readonly id: string;
  readonly url: string;
  readonly storagePath: string | null;
  readonly position: number;
}

export interface ListingFloorPlan extends ListingPhoto {
  readonly label: string;
}

export interface PropertyLocation extends Coordinates {
  readonly privacy: LocationPrivacy;
}

export interface ListingRepresentative {
  readonly agentId: string;
  readonly displayName: string;
  readonly headline: string;
  readonly photoUrl: string | null;
  readonly verified: boolean;
}

export interface Listing {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly resourceId: string;
  readonly intent: ListingIntent;
  readonly kind: ListingKind | null;
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
  readonly amenities: readonly string[];
  readonly houseRules: readonly string[];
  readonly terms: readonly string[];
  readonly minStayNights: number | null;
  readonly advanceMonths: number;
  readonly depositMonths: number;
  readonly sharedFacilities: readonly string[];
  readonly ownerName: string;
  readonly ownerVerified: boolean;
  readonly propertyId?: string;
  readonly propertyType?: PropertyType;
  readonly addressLine?: string;
  readonly maxOccupants?: number;
  readonly bedrooms?: number;
  readonly bathrooms?: number;
  readonly floorAreaSqm?: number | null;
  readonly cleaningFeeCentavos?: Centavos;
  readonly availableFrom?: string | null;
  readonly media?: readonly ListingPhoto[];
  readonly publishedAt?: Date | null;
  readonly updatedAt?: Date | null;
  readonly nextAvailableOn?: string | null;
  readonly saleStatus?: SaleStatus | null;
  readonly lotAreaSqm?: number | null;
  readonly parkingSlots?: number;
  readonly location?: PropertyLocation | null;
  readonly publicLocation?: Coordinates | null;
  readonly distanceKm?: number | null;
  readonly floorPlans?: readonly ListingFloorPlan[];
  readonly representative?: ListingRepresentative | null;
  readonly tourProvider?: 'PLATFORM' | 'MATTERPORT' | null;
}

export interface NearQuery extends Coordinates {
  readonly radiusKm: number;
}

export interface ListingQuery {
  readonly text?: string;
  readonly ids?: readonly string[];
  readonly intent?: ListingIntent;
  readonly saleStatus?: SaleStatus;
  readonly city?: string;
  readonly near?: NearQuery;
  readonly kind?: ListingKind;
  readonly resourceType?: ResourceType;
  readonly propertyType?: PropertyType;
  readonly minPriceCentavos?: Centavos;
  readonly maxPriceCentavos?: Centavos;
  readonly guests?: number;
  readonly bedrooms?: number;
  readonly hasTour?: boolean;
  readonly availableFrom?: string;
  readonly availableTo?: string;
  readonly sort?: ListingSort;
  readonly limit: number;
  readonly offset: number;
}

export interface ListingPage {
  readonly items: readonly Listing[];
  readonly total: number;
}
