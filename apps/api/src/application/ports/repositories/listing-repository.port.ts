import type {
  Furnishing,
  Listing,
  ListingFloorPlan,
  ListingKind,
  ListingPage,
  ListingPhoto,
  ListingQuery,
  ListingState,
  PropertyType,
  ResourceType,
  SaleStatus,
} from '@/domain/listings/listing.ts';
import type { LocationPrivacy } from '@/domain/shared/geo.ts';
import type { Centavos } from '@/domain/shared/money.ts';
import type { PublicScope } from '@/domain/shared/organization-scope.ts';

export type RentalMode = 'LONG_TERM' | 'SHORT_TERM' | 'HYBRID';

export interface PropertyLocationInput {
  readonly latitude: number;
  readonly longitude: number;
  readonly privacy: LocationPrivacy;
}

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
  readonly furnishing?: Furnishing | null | undefined;
  readonly petsAllowed?: boolean | null | undefined;
}

export interface PropertyDetails {
  readonly name: string;
  readonly propertyType: PropertyType;
  readonly addressLine: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly location?: PropertyLocationInput | null;
}

export interface SaleListingDetails {
  readonly title: string;
  readonly description: string;
  readonly amenities: readonly string[];
  readonly saleStatus: SaleStatus;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly floorAreaSqm: number | null;
  readonly lotAreaSqm: number | null;
  readonly parkingSlots: number;
  readonly availableFrom: string | null;
  readonly furnishing?: Furnishing | null | undefined;
}

export interface SaleTermsInput {
  readonly askingPriceInternalCentavos: number | null;
  readonly priceNegotiable: boolean;
  readonly commercialNotes: string;
}

export interface SaleTerms extends SaleTermsInput {
  readonly listingId: string;
  readonly updatedAt: Date | null;
}

export interface CreateSaleListingInput {
  readonly organizationId: string;
  readonly property: PropertyDetails;
  readonly listing: SaleListingDetails;
  readonly saleTerms: SaleTermsInput | null;
  readonly updatedBy: string;
}

export interface UpdateSaleListingInput {
  readonly organizationId: string;
  readonly listingId: string;
  readonly listing: Partial<SaleListingDetails>;
  readonly property?: Partial<PropertyDetails>;
}

export interface AreaSummary {
  readonly cityLabel: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly listingCount: number;
  readonly rentCount: number;
  readonly saleCount: number;
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
  createSaleListing(input: CreateSaleListingInput): Promise<Listing>;
  updateSaleListing(input: UpdateSaleListingInput): Promise<Listing | null>;
  saleTerms(organizationId: string, listingId: string): Promise<SaleTerms | null>;
  saveSaleTerms(
    organizationId: string,
    listingId: string,
    terms: SaleTermsInput,
    updatedBy: string,
  ): Promise<SaleTerms>;
  areas(): Promise<readonly AreaSummary[]>;
  addFloorPlan(
    organizationId: string,
    listingId: string,
    media: NewListingPhoto,
    label: string,
  ): Promise<ListingFloorPlan>;
  removeFloorPlan(
    organizationId: string,
    listingId: string,
    floorPlanId: string,
  ): Promise<{ readonly storagePath: string | null } | null>;
  findRepresented(agentUserId: string, listingId: string): Promise<Listing | null>;
}
