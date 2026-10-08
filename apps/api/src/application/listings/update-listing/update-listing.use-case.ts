import type {
  ListingDetails,
  ListingRepository,
  PropertyDetails,
} from '@/application/ports/repositories/listing-repository.port.ts';
import {
  InvalidListingDetailsError,
  ListingNotFoundError,
  assertValidListingDetails,
  canEditKind,
  type Listing,
} from '@/domain/listings/listing.ts';
import { centavos } from '@/domain/shared/money.ts';
import { assertCoordinates } from '@/domain/shared/geo.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface UpdateListingCommand {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly listingId: string;
  readonly listing: Partial<ListingDetails>;
  readonly property?: Partial<PropertyDetails>;
}

export const updateListing =
  (listings: ListingRepository) =>
  async (command: UpdateListingCommand): Promise<Listing> => {
    assertMayManageOrganization(command.principal, command.organizationId);

    const current = await listings.findById(command.organizationId, command.listingId);
    if (!current) throw new ListingNotFoundError('Listing not found');
    if (current.intent === 'SALE' || current.kind === null) {
      throw new InvalidListingDetailsError('Sale listings are edited with the sale editor');
    }

    if (command.listing.kind !== undefined && command.listing.kind !== current.kind && !canEditKind(current.state)) {
      throw new InvalidListingDetailsError('The rental mode can only change while the listing is a draft');
    }

    const kind = command.listing.kind ?? current.kind;
    if (command.property?.location) assertCoordinates(command.property.location);
    const merged: ListingDetails = {
      kind,
      title: command.listing.title ?? current.title,
      description: command.listing.description ?? current.description,
      priceCentavos: command.listing.priceCentavos ?? current.priceCentavos,
      amenities: command.listing.amenities ?? current.amenities,
      houseRules: command.listing.houseRules ?? current.houseRules,
      terms: command.listing.terms ?? current.terms,
      minStayNights:
        command.listing.minStayNights !== undefined
          ? command.listing.minStayNights
          : kind === 'SHORT_TERM'
            ? (current.minStayNights ?? 1)
            : null,
      advanceMonths: kind === 'SHORT_TERM' ? 0 : (command.listing.advanceMonths ?? current.advanceMonths),
      depositMonths: kind === 'SHORT_TERM' ? 0 : (command.listing.depositMonths ?? current.depositMonths),
      maxOccupants: command.listing.maxOccupants ?? current.maxOccupants ?? 1,
      bedrooms: command.listing.bedrooms ?? current.bedrooms ?? 0,
      bathrooms: command.listing.bathrooms ?? current.bathrooms ?? 0,
      floorAreaSqm:
        command.listing.floorAreaSqm !== undefined ? command.listing.floorAreaSqm : (current.floorAreaSqm ?? null),
      cleaningFeeCentavos:
        kind === 'LONG_TERM'
          ? centavos(0)
          : (command.listing.cleaningFeeCentavos ?? current.cleaningFeeCentavos ?? centavos(0)),
      availableFrom:
        command.listing.availableFrom !== undefined ? command.listing.availableFrom : (current.availableFrom ?? null),
    };

    assertValidListingDetails(merged);

    const updated = await listings.updateListing({
      organizationId: command.organizationId,
      listingId: command.listingId,
      listing: merged,
      ...(command.property ? { property: command.property } : {}),
    });
    if (!updated) throw new ListingNotFoundError('Listing not found');
    return updated;
  };
