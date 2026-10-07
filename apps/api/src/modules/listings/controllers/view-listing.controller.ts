import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Optional,
  Param,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { QUOTE_STAY, VIEW_LISTING } from '@/modules/listings/listing.tokens.ts';
import type { viewListing } from '@/application/listings/view-listing/view-listing.use-case.ts';
import type { quoteStayForListing } from '@/application/listings/quote-stay/quote-stay.use-case.ts';
import {
  toListingHttpResponse,
  toQuoteHttpResponse,
} from '@/modules/listings/mappers/listing-http.mapper.ts';
import { quoteQuerySchema } from '@/modules/listings/dto/listing.dto.ts';

@Controller('listings')
export class ViewListingController {
  constructor(
    @Inject(VIEW_LISTING)
    private readonly view: ReturnType<typeof viewListing>,
    @Optional()
    @Inject(QUOTE_STAY)
    private readonly quote?: ReturnType<typeof quoteStayForListing>,
  ) {}

  @Get(':id')
  async byId(@Param('id') id: string) {
    const parsed = z.guid().safeParse(id);
    if (!parsed.success) throw new NotFoundException('Listing not found');

    const listing = await this.view(parsed.data);
    if (!listing) throw new NotFoundException('Listing not found');
    return toListingHttpResponse(listing);
  }

  @Get(':id/quote')
  async quoteFor(@Param('id') id: string, @Query() rawQuery: unknown) {
    if (!z.guid().safeParse(id).success) throw new NotFoundException('Listing not found');
    const parsed = quoteQuerySchema.safeParse(rawQuery ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid dates');
    }
    if (!this.quote) throw new NotFoundException('Quotes are unavailable');
    const result = await this.quote({
      listingId: id,
      startsOn: parsed.data.checkIn,
      endsOn: parsed.data.checkOut,
      guests: parsed.data.guests,
    });
    return toQuoteHttpResponse(result);
  }
}
