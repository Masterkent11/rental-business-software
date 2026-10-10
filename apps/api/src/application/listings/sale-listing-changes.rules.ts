import type {
  ListingRepository,
  PropertyDetails,
  SaleListingDetails,
} from '@/application/ports/repositories/listing-repository.port.ts';
import {
  InvalidListingDetailsError,
  ListingNotFoundError,
  assertValidSaleDetails,
  type Listing,
} from '@/domain/listings/listing.ts';
import { assertCoordinates } from '@/domain/shared/geo.ts';

export async function applySaleListingChanges(
  listings: ListingRepository,
  input: {
    readonly organizationId: string;
    readonly listingId: string;
    readonly listing: Partial<SaleListingDetails>;
    readonly property?: Partial<PropertyDetails> | undefined;
  },
): Promise<Listing> {
  const current = await listings.findById(input.organizationId, input.listingId);
  if (!current) throw new ListingNotFoundError('Listing not found');
  if (current.intent !== 'SALE') {
    throw new InvalidListingDetailsError('Rental listings are edited with the rental editor');
  }
  if (input.property?.location === null && current.state === 'PUBLISHED') {
    throw new InvalidListingDetailsError('A published sale listing needs a location');
  }
  if (input.property?.location) assertCoordinates(input.property.location);

  assertValidSaleDetails({
    title: input.listing.title ?? current.title,
    description: input.listing.description ?? current.description,
    propertyType: input.property?.propertyType ?? current.propertyType ?? 'HOUSE',
    saleStatus: input.listing.saleStatus ?? current.saleStatus ?? 'READY_FOR_OCCUPANCY',
    bedrooms: input.listing.bedrooms ?? current.bedrooms ?? 0,
    bathrooms: input.listing.bathrooms ?? current.bathrooms ?? 0,
    floorAreaSqm: input.listing.floorAreaSqm !== undefined ? input.listing.floorAreaSqm : (current.floorAreaSqm ?? null),
    lotAreaSqm: input.listing.lotAreaSqm !== undefined ? input.listing.lotAreaSqm : (current.lotAreaSqm ?? null),
    parkingSlots: input.listing.parkingSlots ?? current.parkingSlots ?? 0,
  });

  const updated = await listings.updateSaleListing({
    organizationId: input.organizationId,
    listingId: input.listingId,
    listing: input.listing,
    ...(input.property ? { property: input.property } : {}),
  });
  if (!updated) throw new ListingNotFoundError('Listing not found');
  return updated;
}
