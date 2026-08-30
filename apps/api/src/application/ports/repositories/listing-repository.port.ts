import type {
  Listing,
  ListingKind,
  ListingQuery,
  ListingState,
  ResourceType,
} from '@/domain/listings/listing.ts';
import type { Centavos } from '@/domain/shared/money.ts';
import type { PublicScope } from '@/domain/shared/organization-scope.ts';

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

export interface ListingRepository {
  search(scope: PublicScope, query: ListingQuery): Promise<readonly Listing[]>;
  findPublicById(scope: PublicScope, id: string): Promise<Listing | null>;
  forOrganization(organizationId: string): Promise<readonly Listing[]>;
  findById(organizationId: string, id: string): Promise<Listing | null>;
  createListing(input: CreateListingInput): Promise<Listing>;
  addPhoto(organizationId: string, listingId: string, storageUrl: string): Promise<void>;
  setListingState(organizationId: string, listingId: string, state: ListingState): Promise<Listing | null>;
  listResources(organizationId: string): Promise<readonly OrganizationResource[]>;
}
