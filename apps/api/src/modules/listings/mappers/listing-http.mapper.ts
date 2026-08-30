import type { Listing } from '@/domain/listings/listing.ts';
import { moveInCostFor } from '@/domain/listings/move-in-cost.ts';

export const toListingHttpResponse = (listing: Listing) => ({
  id: listing.id,
  resourceId: listing.resourceId,
  title: listing.title,
  description: listing.description,
  propertyName: listing.propertyName,
  areaLabel: listing.areaLabel,
  cityLabel: listing.cityLabel,
  kind: listing.kind,
  resourceType: listing.resourceType,
  priceCentavos: listing.priceCentavos,
  currency: 'PHP',
  hasTour: listing.hasTour,
  sceneCount: listing.sceneCount,
  photos: listing.photos,
  availabilityLabel: 'Available now',
  isAvailable: true,
  amenities: listing.amenities,
  houseRules: listing.houseRules,
  terms: listing.terms,
  minStayNights: listing.minStayNights,
  sharedFacilities: listing.sharedFacilities,
  ownerName: listing.ownerName,
  ownerVerified: listing.ownerVerified,
  moveInCost: moveInCostFor(listing),
});
