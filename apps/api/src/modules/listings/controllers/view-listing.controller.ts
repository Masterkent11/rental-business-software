import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common';
import { z } from 'zod';
import { VIEW_LISTING } from '@/modules/listings/listing.tokens.ts';
import type { viewListing } from '@/application/listings/view-listing/view-listing.use-case.ts';
import { toListingHttpResponse } from '@/modules/listings/mappers/listing-http.mapper.ts';

@Controller('listings')
export class ViewListingController {
  constructor(
    @Inject(VIEW_LISTING)
    private readonly view: ReturnType<typeof viewListing>,
  ) {}

  @Get(':id')
  async byId(@Param('id') id: string) {
    const parsed = z.guid().safeParse(id);
    if (!parsed.success) throw new NotFoundException('Listing not found');

    const listing = await this.view(parsed.data);
    if (!listing) throw new NotFoundException('Listing not found');
    return toListingHttpResponse(listing);
  }
}
