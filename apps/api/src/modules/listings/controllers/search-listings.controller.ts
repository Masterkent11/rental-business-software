import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import { SEARCH_LISTINGS } from '@/modules/listings/listing.tokens.ts';
import type { searchListings } from '@/application/listings/search-listings/search-listings.use-case.ts';
import { listingQuerySchema } from '@/modules/listings/dto/listing.dto.ts';
import { toListingHttpResponse } from '@/modules/listings/mappers/listing-http.mapper.ts';
import { centavos } from '@/domain/shared/money.ts';
import { clampRadiusKm } from '@/domain/shared/geo.ts';

@Controller('listings')
export class SearchListingsController {
  constructor(
    @Inject(SEARCH_LISTINGS)
    private readonly search: ReturnType<typeof searchListings>,
  ) {}

  @Get()
  async list(@Query() rawQuery: unknown) {
    const parsed = listingQuerySchema.safeParse(rawQuery ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid search');
    }

    const q = parsed.data;
    const page = await this.search({
      ...(q.q !== undefined ? { text: q.q } : {}),
      ...(q.ids !== undefined ? { ids: q.ids } : {}),
      ...(q.intent !== undefined ? { intent: q.intent } : {}),
      ...(q.saleStatus !== undefined ? { saleStatus: q.saleStatus } : {}),
      ...(q.city !== undefined ? { city: q.city } : {}),
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
      ...(q.hasTour !== undefined ? { hasTour: q.hasTour } : {}),
      ...(q.checkIn !== undefined ? { availableFrom: q.checkIn } : q.moveIn !== undefined ? { availableFrom: q.moveIn } : {}),
      ...(q.checkOut !== undefined ? { availableTo: q.checkOut } : {}),
      ...(q.sort !== undefined ? { sort: q.sort } : {}),
      limit: q.limit,
      offset: q.offset,
    });

    return {
      items: page.items.map(toListingHttpResponse),
      total: page.total,
      limit: q.limit,
      offset: q.offset,
      hasMore: q.offset + page.items.length < page.total,
    };
  }
}
