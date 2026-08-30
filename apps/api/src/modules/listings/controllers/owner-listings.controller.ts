import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  LIST_OWNER_LISTINGS,
  LIST_RESOURCES,
  CREATE_LISTING,
  UPLOAD_LISTING_PHOTO,
  SET_LISTING_STATE,
} from '@/modules/listings/listing.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { listOwnerListings } from '@/application/listings/list-owner-listings/list-owner-listings.use-case.ts';
import type { listResources } from '@/application/listings/list-owner-resources/list-owner-resources.use-case.ts';
import type { createListing } from '@/application/listings/create-listing/create-listing.use-case.ts';
import type { uploadListingPhoto } from '@/application/listings/upload-listing-photo/upload-listing-photo.use-case.ts';
import type { setListingState } from '@/application/listings/set-listing-state/set-listing-state.use-case.ts';
import { centavos } from '@/domain/shared/money.ts';
import type { ListingKind } from '@/domain/listings/listing.ts';
import { toListingHttpResponse } from '@/modules/listings/mappers/listing-http.mapper.ts';
import {
  createListingSchema,
  uploadPhotoSchema,
  setListingStateSchema,
} from '@/modules/listings/dto/owner-listing.dto.ts';

@Controller('organizations/:organizationId')
export class OwnerListingsController {
  constructor(
    @Inject(LIST_OWNER_LISTINGS)
    private readonly listListingsUseCase: ReturnType<typeof listOwnerListings>,
    @Inject(LIST_RESOURCES)
    private readonly listResourcesUseCase: ReturnType<typeof listResources>,
    @Inject(CREATE_LISTING)
    private readonly createListingUseCase: ReturnType<typeof createListing>,
    @Inject(UPLOAD_LISTING_PHOTO)
    private readonly uploadPhotoUseCase: ReturnType<typeof uploadListingPhoto>,
    @Inject(SET_LISTING_STATE)
    private readonly setStateUseCase: ReturnType<typeof setListingState>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get('listings')
  async listForOrganization(
    @Param('organizationId') organizationId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.resolve({ authorization: auth, organizationId });
    const rows = await this.listListingsUseCase({ principal, organizationId });
    return { items: rows.map(toListingHttpResponse), total: rows.length };
  }

  @Get('resources')
  async listResources(
    @Param('organizationId') organizationId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.resolve({ authorization: auth, organizationId });
    const resources = await this.listResourcesUseCase({ principal, organizationId });
    return { resources };
  }

  @Post('listings')
  async createListing(
    @Param('organizationId') organizationId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = createListingSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid listing data');
    }

    const principal = await this.resolve({ authorization: auth, organizationId });
    const input = parsed.data;
    const created = await this.createListingUseCase({
      principal,
      organizationId,
      resourceId: input.resourceId,
      kind: input.kind as ListingKind,
      title: input.title,
      description: input.description,
      priceCentavos: centavos(input.priceCentavos),
      amenities: input.amenities,
      houseRules: input.houseRules,
      terms: input.terms,
      minStayNights: input.minStayNights ?? null,
      advanceMonths: input.advanceMonths,
      depositMonths: input.depositMonths,
      photos: input.photos,
    });

    return toListingHttpResponse(created);
  }

  @Post('listings/:id/photos')
  async uploadPhoto(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = uploadPhotoSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new BadRequestException('Invalid photo data');
    }

    const principal = await this.resolve({ authorization: auth, organizationId });
    const result = await this.uploadPhotoUseCase({
      principal,
      organizationId,
      listingId,
      photoBase64: parsed.data.photoBase64,
      contentType: parsed.data.contentType,
    });
    if (!result) throw new NotFoundException('Listing not found');

    return result;
  }

  @Post('listings/:id/publish')
  async togglePublish(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = setListingStateSchema.safeParse(rawBody);
    const publish = parsed.success ? parsed.data.publish : true;

    const principal = await this.resolve({ authorization: auth, organizationId });
    const updated = await this.setStateUseCase({
      principal,
      organizationId,
      listingId,
      publish,
    });
    if (!updated) throw new NotFoundException('Listing not found');

    return toListingHttpResponse(updated);
  }
}
