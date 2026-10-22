import type {
  ListingRepository,
  PropertyDetails,
  SaleListingDetails,
  SaleTermsInput,
} from '@/application/ports/repositories/listing-repository.port.ts';
import {
  DUPLICATE_SEARCH_RADIUS_METERS,
  DuplicatePropertyError,
  InvalidListingDetailsError,
  assertValidInternalPrice,
  assertValidSaleDetails,
  assessDuplicate,
  type Listing,
} from '@/domain/listings/listing.ts';
import { assertCoordinates } from '@/domain/shared/geo.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface CreateSaleListingCommand {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly property: PropertyDetails;
  readonly listing: SaleListingDetails;
  readonly saleTerms: SaleTermsInput | null;
  readonly confirmDistinctProperty: boolean;
}

export const createSaleListing =
  (listings: ListingRepository) =>
  async (command: CreateSaleListingCommand): Promise<Listing> => {
    assertMayManageOrganization(command.principal, command.organizationId);
    assertValidSaleDetails({ ...command.listing, propertyType: command.property.propertyType });
    if (!command.property.location) {
      throw new InvalidListingDetailsError('Set the property location on the map');
    }
    assertCoordinates(command.property.location);
    if (command.saleTerms) assertValidInternalPrice(command.saleTerms.askingPriceInternalCentavos);

    const location = { latitude: command.property.location.latitude, longitude: command.property.location.longitude };
    const candidates = await listings.saleDuplicateCandidates({
      cityLabel: command.property.cityLabel,
      propertyType: command.property.propertyType,
      location,
      radiusMeters: DUPLICATE_SEARCH_RADIUS_METERS,
    });
    const assessment = assessDuplicate(
      {
        name: command.property.name,
        addressLine: command.property.addressLine,
        areaLabel: command.property.areaLabel,
        cityLabel: command.property.cityLabel,
        propertyType: command.property.propertyType,
        location,
        bedrooms: command.listing.bedrooms,
        bathrooms: command.listing.bathrooms,
        floorAreaSqm: command.listing.floorAreaSqm,
        lotAreaSqm: command.listing.lotAreaSqm,
      },
      candidates,
    );
    if (assessment.kind === 'STRONG' && !command.confirmDistinctProperty) {
      throw new DuplicatePropertyError(assessment.listingId);
    }

    return listings.createSaleListing({
      organizationId: command.organizationId,
      property: command.property,
      listing: command.listing,
      saleTerms: command.saleTerms,
      updatedBy: command.principal.userId,
      possibleDuplicateOf: assessment.kind === 'DISTINCT' ? null : assessment.listingId,
    });
  };
