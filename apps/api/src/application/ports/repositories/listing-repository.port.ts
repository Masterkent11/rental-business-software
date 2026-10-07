import type {
  Listing,
  ListingKind,
  ListingPage,
  ListingPhoto,
  ListingQuery,
  ListingState,
  PropertyType,
  ResourceType,
} from '@/domain/listings/listing.ts';
import type { Centavos } from '@/domain/shared/money.ts';
import type { PublicScope } from '@/domain/shared/organization-scope.ts';

export type RentalMode = 'LONG_TERM' | 'SHORT_TERM' | 'HYBRID';

export interface CreateListingInput {
  readonly organizationId: string;
  readonly resourceId: string;
  readonly kind: ListingKind;
  readonly title: string;
  readonly description: string;
  readonly priceCentavos: Centavos;
  readonly amenities: readonly string[];
  readonly houseRules: readonly string[];
  readonly terms: readonly string[];
  readonly minStayNights: number | null;
  readonly advanceMonths: number;
  readonly depositMonths: number;
  readonly photos?: readonly string[];
}

export interface ListingDetails {
  readonly kind: ListingKind;
  readonly title: string;
  readonly description: string;
  readonly priceCentavos: Centavos;
  readonly amenities: readonly string[];
  readonly houseRules: readonly string[];
  readonly terms: readonly string[];
  readonly minStayNights: number | null;
  readonly advanceMonths: number;
  readonly depositMonths: number;
  readonly maxOccupants: number;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly floorAreaSqm: number | null;
  readonly cleaningFeeCentavos: Centavos;
  readonly availableFrom: string | null;
}

export interface PropertyDetails {
  readonly name: string;
  readonly propertyType: PropertyType;
  readonly addressLine: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
}

export interface CreatePropertyListingInput {
  readonly organizationId: string;
  readonly property: PropertyDetails;
  readonly resource: {
    readonly label: string;
    readonly resourceType: ResourceType;
    readonly rentalMode: RentalMode;
  };
  readonly listing: ListingDetails;
}

export interface UpdateListingInput {
  readonly organizationId: string;
  readonly listingId: string;
  readonly listing: Partial<ListingDetails>;
  readonly property?: Partial<PropertyDetails>;
}

export interface NewListingPhoto {
  readonly storagePath: string;
  readonly url: string;
  readonly contentType: string;
  readonly sizeBytes: number;
}

export interface OrganizationResource {
  readonly id: string;
  readonly propertyId: string;
  readonly propertyName: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly label: string;
  readonly resourceType: ResourceType;
  readonly rentalMode: string;
}

export interface OwnerProperty {
  readonly id: string;
  readonly name: string;
  readonly propertyType: PropertyType;
  readonly addressLine: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly resourceCount: number;
  readonly listingCount: number;
  readonly publishedCount: number;
  readonly coverPhoto: string | null;
}

export interface StayPricingSource {
  readonly listingId: string;
  readonly organizationId: string;
  readonly resourceId: string;
  readonly nightlyCentavos: Centavos;
  readonly cleaningFeeCentavos: Centavos;
  readonly minStayNights: number;
  readonly maxOccupants: number;
}

export interface ListingRepository {
  search(scope: PublicScope, query: ListingQuery): Promise<ListingPage>;
  findPublicById(scope: PublicScope, id: string): Promise<Listing | null>;
  forOrganization(organizationId: string): Promise<readonly Listing[]>;
  findById(organizationId: string, id: string): Promise<Listing | null>;
  createListing(input: CreateListingInput): Promise<Listing>;
  createPropertyListing(input: CreatePropertyListingInput): Promise<Listing>;
  updateListing(input: UpdateListingInput): Promise<Listing | null>;
  addPhoto(organizationId: string, listingId: string, photo: NewListingPhoto): Promise<ListingPhoto>;
  removePhoto(
    organizationId: string,
    listingId: string,
    photoId: string,
  ): Promise<{ readonly storagePath: string | null } | null>;
  reorderPhotos(
    organizationId: string,
    listingId: string,
    photoIds: readonly string[],
  ): Promise<void>;
  setListingState(organizationId: string, listingId: string, state: ListingState): Promise<Listing | null>;
  isOrganizationVerified(organizationId: string): Promise<boolean>;
  listResources(organizationId: string): Promise<readonly OrganizationResource[]>;
  listProperties(organizationId: string): Promise<readonly OwnerProperty[]>;
  stayPricing(listingId: string): Promise<StayPricingSource | null>;
}
