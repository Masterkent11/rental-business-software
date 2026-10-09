import type { ListingQuery } from '@/domain/listings/listing.ts';
import { centavos } from '@/domain/shared/money.ts';
import { clampRadiusKm } from '@/domain/shared/geo.ts';
import type { ListingQueryDto } from '@/modules/listings/dto/listing.dto.ts';

export function toListingQuery(q: ListingQueryDto): ListingQuery {
  return {
    ...(q.q !== undefined ? { text: q.q } : {}),
    ...(q.ids !== undefined ? { ids: q.ids } : {}),
    ...(q.intent !== undefined ? { intent: q.intent } : {}),
    ...(q.saleStatus !== undefined ? { saleStatus: q.saleStatus } : {}),
    ...(q.city !== undefined ? { city: q.city } : {}),
    ...(q.area !== undefined ? { area: q.area } : {}),
    ...(q.lat !== undefined && q.lng !== undefined
      ? { near: { latitude: q.lat, longitude: q.lng, radiusKm: clampRadiusKm(q.radiusKm) } }
      : {}),
    ...(q.kind !== undefined ? { kind: q.kind } : {}),
    ...(q.type !== undefined ? { resourceType: q.type } : {}),
    ...(q.propertyType !== undefined ? { propertyType: q.propertyType } : {}),
    ...(q.minPrice !== undefined ? { minPriceCentavos: centavos(q.minPrice) } : {}),
    ...(q.maxPrice !== undefined ? { maxPriceCentavos: centavos(q.maxPrice) } : {}),
    ...(q.guests !== undefined ? { guests: q.guests } : {}),
    ...(q.bedrooms !== undefined ? { bedrooms: q.bedrooms } : {}),
    ...(q.bathrooms !== undefined ? { bathrooms: q.bathrooms } : {}),
    ...(q.minFloorArea !== undefined ? { minFloorAreaSqm: q.minFloorArea } : {}),
    ...(q.furnished ? { furnished: true } : {}),
    ...(q.petsAllowed ? { petsAllowed: true } : {}),
    ...(q.amenity !== undefined ? { amenity: q.amenity } : {}),
    ...(q.hasTour !== undefined ? { hasTour: q.hasTour } : {}),
    ...(q.checkIn !== undefined ? { availableFrom: q.checkIn } : q.moveIn !== undefined ? { availableFrom: q.moveIn } : {}),
    ...(q.checkOut !== undefined ? { availableTo: q.checkOut } : {}),
    ...(q.sort !== undefined ? { sort: q.sort } : {}),
    limit: q.limit,
    offset: q.offset,
  };
}
