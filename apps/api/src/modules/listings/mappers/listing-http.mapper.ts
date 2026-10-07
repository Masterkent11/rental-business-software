import type { Listing } from '@/domain/listings/listing.ts';
import { moveInCostFor } from '@/domain/listings/move-in-cost.ts';
import type { OwnerProperty } from '@/application/ports/repositories/listing-repository.port.ts';
import type { StayQuoteResult } from '@/application/listings/quote-stay/quote-stay.use-case.ts';
import type { ListingCalendar } from '@/application/bookings/manage-availability-blocks/manage-availability-blocks.use-case.ts';
import type { AvailabilityBlock } from '@/application/ports/repositories/booking-repository.port.ts';

const availabilityFor = (listing: Listing) => {
  const next = listing.nextAvailableOn ?? null;
  if (listing.kind === 'SHORT_TERM') {
    return { availabilityLabel: 'Check dates', isAvailable: true, nextAvailableOn: next };
  }
  if (!next) {
    return { availabilityLabel: 'Currently occupied', isAvailable: false, nextAvailableOn: null };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (next <= today) {
    return { availabilityLabel: 'Available now', isAvailable: true, nextAvailableOn: next };
  }
  const label = new Date(`${next}T00:00:00Z`).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return { availabilityLabel: `Available from ${label}`, isAvailable: true, nextAvailableOn: next };
};

export const toListingHttpResponse = (listing: Listing) => ({
  id: listing.id,
  resourceId: listing.resourceId,
  propertyId: listing.propertyId ?? null,
  title: listing.title,
  description: listing.description,
  propertyName: listing.propertyName,
  propertyType: listing.propertyType ?? null,
  addressLine: listing.addressLine ?? '',
  areaLabel: listing.areaLabel,
  cityLabel: listing.cityLabel,
  kind: listing.kind,
  resourceType: listing.resourceType,
  priceCentavos: listing.priceCentavos,
  cleaningFeeCentavos: listing.cleaningFeeCentavos ?? 0,
  currency: 'PHP',
  hasTour: listing.hasTour,
  sceneCount: listing.sceneCount,
  photos: listing.photos,
  ...availabilityFor(listing),
  amenities: listing.amenities,
  houseRules: listing.houseRules,
  terms: listing.terms,
  minStayNights: listing.minStayNights,
  maxOccupants: listing.maxOccupants ?? null,
  bedrooms: listing.bedrooms ?? null,
  bathrooms: listing.bathrooms ?? null,
  floorAreaSqm: listing.floorAreaSqm ?? null,
  availableFrom: listing.availableFrom ?? null,
  sharedFacilities: listing.sharedFacilities,
  ownerName: listing.ownerName,
  ownerVerified: listing.ownerVerified,
  moveInCost: moveInCostFor(listing),
  publishedAt: listing.publishedAt?.toISOString() ?? null,
});

export const toOwnerListingHttpResponse = (listing: Listing, publishProblems?: readonly string[]) => ({
  ...toListingHttpResponse(listing),
  state: listing.state,
  advanceMonths: listing.advanceMonths,
  depositMonths: listing.depositMonths,
  media: (listing.media ?? []).map((photo) => ({
    id: photo.id,
    url: photo.url,
    storagePath: photo.storagePath,
    position: photo.position,
  })),
  updatedAt: listing.updatedAt?.toISOString() ?? null,
  ...(publishProblems ? { publishProblems } : {}),
});

export const toOwnerPropertyHttpResponse = (property: OwnerProperty) => ({ ...property });

export const toQuoteHttpResponse = (quote: StayQuoteResult) => ({
  listingId: quote.listingId,
  nights: quote.nights,
  guests: quote.guests,
  nightlyCentavos: quote.nightlyCentavos,
  lines: quote.lines,
  totalCentavos: quote.totalCentavos,
  currency: 'PHP',
  available: quote.available,
  takenNights: quote.takenNights,
});

const toBlock = (block: AvailabilityBlock) => ({
  id: block.id,
  startsOn: block.during.startsOn,
  endsOn: block.during.endsOn,
  note: block.note,
});

export const toBlockHttpResponse = toBlock;

export const toCalendarHttpResponse = (calendar: ListingCalendar) => ({
  listingId: calendar.listingId,
  resourceId: calendar.resourceId,
  nights: calendar.nights,
  blocks: calendar.blocks.map(toBlock),
});
