import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  ADD_AVAILABILITY_BLOCK,
  CREATE_LISTING,
  CREATE_PROPERTY_LISTING,
  GET_LISTING_CALENDAR,
  GET_OWNER_LISTING,
  LIST_OWNER_LISTINGS,
  LIST_OWNER_PROPERTIES,
  LIST_RESOURCES,
  REGISTER_LISTING_PHOTO,
  REMOVE_AVAILABILITY_BLOCK,
  REMOVE_LISTING_PHOTO,
  REORDER_LISTING_PHOTOS,
  SET_LISTING_STATE,
  UPDATE_LISTING,
} from '@/modules/listings/listing.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { listOwnerListings } from '@/application/listings/list-owner-listings/list-owner-listings.use-case.ts';
import type { listResources } from '@/application/listings/list-owner-resources/list-owner-resources.use-case.ts';
import type { listOwnerProperties } from '@/application/listings/list-owner-properties/list-owner-properties.use-case.ts';
import type { getOwnerListing } from '@/application/listings/get-owner-listing/get-owner-listing.use-case.ts';
import type { createListing } from '@/application/listings/create-listing/create-listing.use-case.ts';
import type { createPropertyListing } from '@/application/listings/create-property-listing/create-property-listing.use-case.ts';
import type { UpdateListingCommand, updateListing } from '@/application/listings/update-listing/update-listing.use-case.ts';
import type { registerListingPhoto } from '@/application/listings/register-listing-photo/register-listing-photo.use-case.ts';
import type { removeListingPhoto } from '@/application/listings/remove-listing-photo/remove-listing-photo.use-case.ts';
import type { reorderListingPhotos } from '@/application/listings/reorder-listing-photos/reorder-listing-photos.use-case.ts';
import type { setListingState } from '@/application/listings/set-listing-state/set-listing-state.use-case.ts';
import type {
  addAvailabilityBlock,
  getListingCalendar,
  removeAvailabilityBlock,
} from '@/application/bookings/manage-availability-blocks/manage-availability-blocks.use-case.ts';
import { centavos } from '@/domain/shared/money.ts';
import type { ListingKind } from '@/domain/listings/listing.ts';
import {
  toBlockHttpResponse,
  toCalendarHttpResponse,
  toOwnerListingHttpResponse,
  toOwnerPropertyHttpResponse,
} from '@/modules/listings/mappers/listing-http.mapper.ts';
import {
  addBlockSchema,
  calendarQuerySchema,
  createListingSchema,
  createPropertyListingSchema,
  listingActionSchema,
  registerPhotoSchema,
  reorderPhotosSchema,
  setListingStateSchema,
  updateListingSchema,
} from '@/modules/listings/dto/owner-listing.dto.ts';

const parse = <T>(schema: z.ZodType<T>, raw: unknown): T => {
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    throw new BadRequestException(`${where}${issue?.message ?? 'Invalid request'}`);
  }
  return parsed.data;
};

const guid = (value: string, what: string) => {
  if (!z.guid().safeParse(value).success) throw new BadRequestException(`Not a valid ${what} id`);
  return value;
};

@Controller('organizations/:organizationId')
export class OwnerListingsController {
  constructor(
    @Inject(LIST_OWNER_LISTINGS)
    private readonly listListingsUseCase: ReturnType<typeof listOwnerListings>,
    @Inject(LIST_RESOURCES)
    private readonly listResourcesUseCase: ReturnType<typeof listResources>,
    @Inject(LIST_OWNER_PROPERTIES)
    private readonly listPropertiesUseCase: ReturnType<typeof listOwnerProperties>,
    @Inject(GET_OWNER_LISTING)
    private readonly getListingUseCase: ReturnType<typeof getOwnerListing>,
    @Inject(CREATE_LISTING)
    private readonly createListingUseCase: ReturnType<typeof createListing>,
    @Inject(CREATE_PROPERTY_LISTING)
    private readonly createPropertyListingUseCase: ReturnType<typeof createPropertyListing>,
    @Inject(UPDATE_LISTING)
    private readonly updateListingUseCase: ReturnType<typeof updateListing>,
    @Inject(REGISTER_LISTING_PHOTO)
    private readonly registerPhotoUseCase: ReturnType<typeof registerListingPhoto>,
    @Inject(REMOVE_LISTING_PHOTO)
    private readonly removePhotoUseCase: ReturnType<typeof removeListingPhoto>,
    @Inject(REORDER_LISTING_PHOTOS)
    private readonly reorderPhotosUseCase: ReturnType<typeof reorderListingPhotos>,
    @Inject(SET_LISTING_STATE)
    private readonly setStateUseCase: ReturnType<typeof setListingState>,
    @Inject(GET_LISTING_CALENDAR)
    private readonly calendarUseCase: ReturnType<typeof getListingCalendar>,
    @Inject(ADD_AVAILABILITY_BLOCK)
    private readonly addBlockUseCase: ReturnType<typeof addAvailabilityBlock>,
    @Inject(REMOVE_AVAILABILITY_BLOCK)
    private readonly removeBlockUseCase: ReturnType<typeof removeAvailabilityBlock>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  private principal(organizationId: string, auth: string | undefined) {
    return this.resolve({ authorization: auth, organizationId: guid(organizationId, 'organization') });
  }

  @Get('listings')
  async listForOrganization(
    @Param('organizationId') organizationId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(organizationId, auth);
    const rows = await this.listListingsUseCase({ principal, organizationId });
    return { items: rows.map((row) => toOwnerListingHttpResponse(row)), total: rows.length };
  }

  @Get('listings/:id')
  async getOne(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(organizationId, auth);
    const view = await this.getListingUseCase({
      principal,
      organizationId,
      listingId: guid(listingId, 'listing'),
    });
    return toOwnerListingHttpResponse(view.listing, view.publishProblems);
  }

  @Get('resources')
  async listResources(
    @Param('organizationId') organizationId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(organizationId, auth);
    const resources = await this.listResourcesUseCase({ principal, organizationId });
    return { resources };
  }

  @Get('properties')
  async listProperties(
    @Param('organizationId') organizationId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(organizationId, auth);
    const properties = await this.listPropertiesUseCase({ principal, organizationId });
    return { properties: properties.map(toOwnerPropertyHttpResponse) };
  }

  @Post('properties')
  async createProperty(
    @Param('organizationId') organizationId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(createPropertyListingSchema, rawBody);
    const principal = await this.principal(organizationId, auth);
    const created = await this.createPropertyListingUseCase({
      principal,
      organizationId,
      property: input.property,
      unitLabel: input.unitLabel,
      rentalMode: input.rentalMode,
      listing: {
        ...input.listing,
        priceCentavos: centavos(input.listing.priceCentavos),
        cleaningFeeCentavos: centavos(input.listing.cleaningFeeCentavos),
      },
    });
    const view = await this.getListingUseCase({ principal, organizationId, listingId: created.id });
    return toOwnerListingHttpResponse(view.listing, view.publishProblems);
  }

  @Post('listings')
  async createListing(
    @Param('organizationId') organizationId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(createListingSchema, rawBody);
    const principal = await this.principal(organizationId, auth);
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
      photos: [],
    });
    return toOwnerListingHttpResponse(created);
  }

  @Patch('listings/:id')
  async update(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(updateListingSchema, rawBody);
    const principal = await this.principal(organizationId, auth);
    const listing = Object.fromEntries(
      Object.entries(input.listing).filter(([, value]) => value !== undefined),
    ) as UpdateListingCommand['listing'];
    if (input.listing.priceCentavos !== undefined) {
      Object.assign(listing, { priceCentavos: centavos(input.listing.priceCentavos) });
    }
    if (input.listing.cleaningFeeCentavos !== undefined) {
      Object.assign(listing, { cleaningFeeCentavos: centavos(input.listing.cleaningFeeCentavos) });
    }
    await this.updateListingUseCase({
      principal,
      organizationId,
      listingId: guid(listingId, 'listing'),
      listing,
      ...(input.property
        ? {
            property: Object.fromEntries(
              Object.entries(input.property).filter(([, value]) => value !== undefined),
            ) as NonNullable<UpdateListingCommand['property']>,
          }
        : {}),
    });
    const view = await this.getListingUseCase({ principal, organizationId, listingId });
    return toOwnerListingHttpResponse(view.listing, view.publishProblems);
  }

  @Post('listings/:id/photos')
  async registerPhoto(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(registerPhotoSchema, rawBody);
    const principal = await this.principal(organizationId, auth);
    const photo = await this.registerPhotoUseCase({
      principal,
      organizationId,
      listingId: guid(listingId, 'listing'),
      storagePath: input.storagePath,
    });
    return photo;
  }

  @Delete('listings/:id/photos/:photoId')
  async removePhoto(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Param('photoId') photoId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(organizationId, auth);
    return this.removePhotoUseCase({
      principal,
      organizationId,
      listingId: guid(listingId, 'listing'),
      photoId: guid(photoId, 'photo'),
    });
  }

  @Put('listings/:id/photos/order')
  async reorderPhotos(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(reorderPhotosSchema, rawBody);
    const principal = await this.principal(organizationId, auth);
    const listing = await this.reorderPhotosUseCase({
      principal,
      organizationId,
      listingId: guid(listingId, 'listing'),
      photoIds: input.photoIds,
    });
    return toOwnerListingHttpResponse(listing);
  }

  @Post('listings/:id/state')
  @HttpCode(200)
  async changeState(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(listingActionSchema, rawBody);
    const principal = await this.principal(organizationId, auth);
    const updated = await this.setStateUseCase({
      principal,
      organizationId,
      listingId: guid(listingId, 'listing'),
      action: input.action,
    });
    return toOwnerListingHttpResponse(updated);
  }

  @Post('listings/:id/publish')
  @HttpCode(200)
  async togglePublish(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(setListingStateSchema, rawBody);
    const principal = await this.principal(organizationId, auth);
    const updated = await this.setStateUseCase({
      principal,
      organizationId,
      listingId: guid(listingId, 'listing'),
      action: input.publish ? 'PUBLISH' : 'UNPUBLISH',
    });
    return toOwnerListingHttpResponse(updated);
  }

  @Get('listings/:id/calendar')
  async calendar(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Query() rawQuery: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const query = parse(calendarQuerySchema, rawQuery);
    const principal = await this.principal(organizationId, auth);
    const calendar = await this.calendarUseCase({
      principal,
      organizationId,
      listingId: guid(listingId, 'listing'),
      from: query.from,
      to: query.to,
    });
    return toCalendarHttpResponse(calendar);
  }

  @Post('listings/:id/blocks')
  async addBlock(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(addBlockSchema, rawBody);
    const principal = await this.principal(organizationId, auth);
    const block = await this.addBlockUseCase({
      principal,
      organizationId,
      listingId: guid(listingId, 'listing'),
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      note: input.note,
    });
    return toBlockHttpResponse(block);
  }

  @Delete('blocks/:blockId')
  async removeBlock(
    @Param('organizationId') organizationId: string,
    @Param('blockId') blockId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(organizationId, auth);
    await this.removeBlockUseCase({ principal, organizationId, blockId: guid(blockId, 'block') });
    return { removed: true };
  }
}
