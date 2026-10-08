import type {
  ListingRepository,
  PropertyDetails,
  SaleListingDetails,
  SaleTermsInput,
} from '@/application/ports/repositories/listing-repository.port.ts';
import {
  InvalidListingDetailsError,
  assertValidInternalPrice,
  assertValidSaleDetails,
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

    return listings.createSaleListing({
      organizationId: command.organizationId,
      property: command.property,
      listing: command.listing,
      saleTerms: command.saleTerms,
      updatedBy: command.principal.userId,
    });
  };
