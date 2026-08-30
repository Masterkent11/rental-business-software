import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import {
  GET_SAVED_LISTINGS,
  RESOLVE_PRINCIPAL,
  SAVE_LISTING,
  UNSAVE_LISTING,
} from '@/modules/me/me.tokens.ts';
import type { getSavedListings } from '@/application/me/get-saved-listings/get-saved-listings.use-case.ts';
import type { saveListing } from '@/application/me/save-listing/save-listing.use-case.ts';
import type { unsaveListing } from '@/application/me/unsave-listing/unsave-listing.use-case.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import { saveListingBodySchema } from '@/modules/me/dto/save-listing.dto.ts';

@Controller('me/saved-listings')
export class SavedListingsController {
  constructor(
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
    @Inject(GET_SAVED_LISTINGS)
    private readonly savedListingsUseCase: ReturnType<typeof getSavedListings>,
    @Inject(SAVE_LISTING)
    private readonly saveListingUseCase: ReturnType<typeof saveListing>,
    @Inject(UNSAVE_LISTING)
    private readonly unsaveListingUseCase: ReturnType<typeof unsaveListing>,
  ) {}

  @Get()
  async getSavedListings(
    @Headers('authorization') auth?: string,
    @Headers('x-organization-id') orgHeader?: string,
  ) {
    const principal = await this.resolve({
      authorization: auth,
      organizationId: orgHeader?.trim() || null,
    });

    const listingIds = await this.savedListingsUseCase({ userId: principal.userId });
    return { listingIds };
  }

  @Post()
  async saveListing(
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
    @Headers('x-organization-id') orgHeader?: string,
  ) {
    const parsed = saveListingBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('listingId must be a UUID');
    }

    const principal = await this.resolve({
      authorization: auth,
      organizationId: orgHeader?.trim() || null,
    });

    const listingIds = await this.saveListingUseCase({
      userId: principal.userId,
      listingId: parsed.data.listingId,
    });
    return { listingIds };
  }

  @Delete(':listingId')
  async unsaveListing(
    @Param('listingId') listingId: string,
    @Headers('authorization') auth?: string,
    @Headers('x-organization-id') orgHeader?: string,
  ) {
    if (!z.guid().safeParse(listingId).success) {
      throw new NotFoundException('listingId must be a UUID');
    }

    const principal = await this.resolve({
      authorization: auth,
      organizationId: orgHeader?.trim() || null,
    });

    const listingIds = await this.unsaveListingUseCase({
      userId: principal.userId,
      listingId,
    });
    return { listingIds };
  }
}
