import type {
  CreatePropertyListingInput,
  ListingDetails,
  ListingRepository,
  PropertyDetails,
  RentalMode,
} from '@/application/ports/repositories/listing-repository.port.ts';
import type { Listing } from '@/domain/listings/listing.ts';
import {
  assertValidListingDetails,
  resourceTypeForProperty,
} from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertCoordinates } from '@/domain/shared/geo.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface CreatePropertyListingCommand {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly property: PropertyDetails;
  readonly unitLabel: string;
  readonly rentalMode: RentalMode;
  readonly listing: ListingDetails;
}

export const createPropertyListing =
  (listings: ListingRepository) =>
  async (command: CreatePropertyListingCommand): Promise<Listing> => {
    assertMayManageOrganization(command.principal, command.organizationId);
    assertValidListingDetails(command.listing);
    if (command.property.location) assertCoordinates(command.property.location);

    const kindMatchesMode =
      command.rentalMode === 'HYBRID' || command.rentalMode === command.listing.kind;
    const listing: ListingDetails = kindMatchesMode
      ? command.listing
      : { ...command.listing, kind: command.rentalMode as ListingDetails['kind'] };

    const input: CreatePropertyListingInput = {
      organizationId: command.organizationId,
      property: command.property,
      resource: {
        label: command.unitLabel.trim() || command.property.name.trim(),
        resourceType: resourceTypeForProperty(command.property.propertyType),
        rentalMode: command.rentalMode,
      },
      listing,
    };

    return listings.createPropertyListing(input);
  };
