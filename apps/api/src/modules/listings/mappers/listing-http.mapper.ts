import type { Listing } from '@/domain/listings/listing.ts';
import { publicPriceCentavos } from '@/domain/listings/listing.ts';
import { moveInCostFor } from '@/domain/listings/move-in-cost.ts';
import type {
  AreaSummary,
  OwnerProperty,
  SaleTerms,
} from '@/application/ports/repositories/listing-repository.port.ts';
import type { StayQuoteResult } from '@/application/listings/quote-stay/quote-stay.use-case.ts';
import type { ListingCalendar } from '@/application/bookings/manage-availability-blocks/manage-availability-blocks.use-case.ts';
import type { AvailabilityBlock } from '@/application/ports/repositories/booking-repository.port.ts';

const availabilityFor = (listing: Listing) => {
  const next = listing.nextAvailableOn ?? null;
  if (listing.intent === 'SALE') {
    const label =
      listing.saleStatus === 'PRE_SELLING'
        ? 'Pre-selling'
        : listing.saleStatus === 'UNDER_CONSTRUCTION'
          ? 'Under construction'
          : 'Ready for occupancy';
    return { availabilityLabel: label, isAvailable: true, nextAvailableOn: null };
  }
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
  intent: listing.intent,
  pricing: listing.intent === 'SALE' ? ('ON_INQUIRY' as const) : ('LISTED' as const),
  title: listing.title,
  description: listing.description,
  propertyName: listing.propertyName,
  propertyType: listing.propertyType ?? null,
  addressLine: listing.addressLine ?? '',
  areaLabel: listing.areaLabel,
  cityLabel: listing.cityLabel,
  kind: listing.kind,
  resourceType: listing.resourceType,
  priceCentavos: publicPriceCentavos(listing),
  cleaningFeeCentavos: listing.intent === 'SALE' ? null : (listing.cleaningFeeCentavos ?? 0),
  currency: 'PHP',
  hasTour: listing.hasTour,
  tourProvider: listing.tourProvider ?? null,
  sceneCount: listing.sceneCount,
  photos: listing.photos,
  floorPlans: (listing.floorPlans ?? []).map((plan) => ({ id: plan.id, url: plan.url, label: plan.label })),
  saleStatus: listing.saleStatus ?? null,
  furnishing: listing.furnishing ?? null,
  petsAllowed: listing.intent === 'SALE' ? null : (listing.petsAllowed ?? null),
  lotAreaSqm: listing.lotAreaSqm ?? null,
  parkingSlots: listing.parkingSlots ?? 0,
  location: listing.publicLocation
    ? {
        latitude: listing.publicLocation.latitude,
        longitude: listing.publicLocation.longitude,
        precision: listing.location?.privacy === 'EXACT' ? ('EXACT' as const) : ('APPROXIMATE' as const),
      }
    : null,
  distanceKm: listing.distanceKm ?? null,
  representative: listing.representative
    ? {
        agentId: listing.representative.agentId,
        displayName: listing.representative.displayName,
        headline: listing.representative.headline,
        photoUrl: listing.representative.photoUrl,
        verified: listing.representative.verified,
      }
    : null,
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
  exactLocation: listing.location
    ? { latitude: listing.location.latitude, longitude: listing.location.longitude, privacy: listing.location.privacy }
    : null,
  floorPlanMedia: (listing.floorPlans ?? []).map((plan) => ({
    id: plan.id,
    url: plan.url,
    label: plan.label,
    storagePath: plan.storagePath,
    position: plan.position,
  })),
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

export const toSaleTermsHttpResponse = (terms: SaleTerms) => ({
  listingId: terms.listingId,
  askingPriceInternalCentavos: terms.askingPriceInternalCentavos,
  priceNegotiable: terms.priceNegotiable,
  commercialNotes: terms.commercialNotes,
  updatedAt: terms.updatedAt?.toISOString() ?? null,
  confidential: true,
});

export const toAreaHttpResponse = (area: AreaSummary) => ({ ...area });
