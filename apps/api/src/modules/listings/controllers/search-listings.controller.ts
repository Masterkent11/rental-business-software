import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import { SEARCH_LISTINGS } from '@/modules/listings/listing.tokens.ts';
import type { searchListings } from '@/application/listings/search-listings/search-listings.use-case.ts';
import { listingQuerySchema } from '@/modules/listings/dto/listing.dto.ts';
import { toListingHttpResponse } from '@/modules/listings/mappers/listing-http.mapper.ts';
import { toListingQuery } from '@/modules/listings/mappers/listing-query.mapper.ts';

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
    const page = await this.search(toListingQuery(q));

    return {
      items: page.items.map(toListingHttpResponse),
      total: page.total,
      limit: q.limit,
      offset: q.offset,
      hasMore: q.offset + page.items.length < page.total,
    };
  }
}
