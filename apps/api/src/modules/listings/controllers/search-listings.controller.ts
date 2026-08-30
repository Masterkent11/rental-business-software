import { Controller, Get, Inject, Query } from '@nestjs/common';
import { SEARCH_LISTINGS } from '@/modules/listings/listing.tokens.ts';
import type { searchListings } from '@/application/listings/search-listings/search-listings.use-case.ts';
import { listingQuerySchema } from '@/modules/listings/dto/listing.dto.ts';
import { toListingHttpResponse } from '@/modules/listings/mappers/listing-http.mapper.ts';
import { centavos } from '@/domain/shared/money.ts';

@Controller('listings')
export class SearchListingsController {
  constructor(
    @Inject(SEARCH_LISTINGS)
    private readonly search: ReturnType<typeof searchListings>,
  ) {}

  @Get()
  async list(@Query() rawQuery: unknown) {
    const parsed = listingQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return { statusCode: 400, title: 'Invalid query', errors: parsed.error.issues };
    }

    const q = parsed.data;
    const results = await this.search({
      ...(q.q !== undefined ? { text: q.q } : {}),
      ...(q.ids !== undefined ? { ids: q.ids } : {}),
      ...(q.kind !== undefined ? { kind: q.kind } : {}),
      ...(q.type !== undefined ? { resourceType: q.type } : {}),
      ...(q.maxPrice !== undefined ? { maxPriceCentavos: centavos(q.maxPrice) } : {}),
      ...(q.hasTour !== undefined ? { hasTour: q.hasTour } : {}),
      limit: q.limit,
      offset: q.offset,
    });

    return { items: results.map(toListingHttpResponse), limit: q.limit, offset: q.offset };
  }
}
