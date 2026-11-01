import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { z } from 'zod';
import {
  GET_PARTNER_LISTING,
  GET_SALE_TERMS,
  REGISTER_FLOOR_PLAN,
  REGISTER_LISTING_PHOTO,
  REMOVE_FLOOR_PLAN,
  REMOVE_LISTING_PHOTO,
  REORDER_LISTING_PHOTOS,
  SAVE_SALE_TERMS,
  UPDATE_SALE_LISTING,
} from '@/modules/listings/listing.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { getPartnerListing } from '@/application/listings/get-partner-listing/get-partner-listing.use-case.ts';
import type { updateSaleListing } from '@/application/listings/update-sale-listing/update-sale-listing.use-case.ts';
import type { getSaleTerms } from '@/application/listings/get-sale-terms/get-sale-terms.use-case.ts';
import type { saveSaleTerms } from '@/application/listings/save-sale-terms/save-sale-terms.use-case.ts';
import type { registerFloorPlan } from '@/application/listings/register-floor-plan/register-floor-plan.use-case.ts';
import type { removeFloorPlan } from '@/application/listings/remove-floor-plan/remove-floor-plan.use-case.ts';
import type { registerListingPhoto } from '@/application/listings/register-listing-photo/register-listing-photo.use-case.ts';
import type { removeListingPhoto } from '@/application/listings/remove-listing-photo/remove-listing-photo.use-case.ts';
import type { reorderListingPhotos } from '@/application/listings/reorder-listing-photos/reorder-listing-photos.use-case.ts';
import {
  registerFloorPlanSchema,
  registerPhotoSchema,
  reorderPhotosSchema,
  saleTermsSchema,
  updateSaleListingSchema,
} from '@/modules/listings/dto/owner-listing.dto.ts';
import {
  toChangeProposalHttpResponse,
  toOwnerListingHttpResponse,
  toSaleTermsHttpResponse,
} from '@/modules/listings/mappers/listing-http.mapper.ts';

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

type Defined<T> = { [K in keyof T]?: Exclude<T[K], undefined> };

const defined = <T extends object>(value: T): Defined<T> =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Defined<T>;

@Controller('agent/listings')
export class AgentListingsController {
  constructor(
    @Inject(GET_PARTNER_LISTING)
    private readonly getListingUseCase: ReturnType<typeof getPartnerListing>,
    @Inject(UPDATE_SALE_LISTING)
    private readonly updateUseCase: ReturnType<typeof updateSaleListing>,
    @Inject(GET_SALE_TERMS)
    private readonly getTermsUseCase: ReturnType<typeof getSaleTerms>,
    @Inject(SAVE_SALE_TERMS)
    private readonly saveTermsUseCase: ReturnType<typeof saveSaleTerms>,
    @Inject(REGISTER_FLOOR_PLAN)
    private readonly registerFloorPlanUseCase: ReturnType<typeof registerFloorPlan>,
    @Inject(REMOVE_FLOOR_PLAN)
    private readonly removeFloorPlanUseCase: ReturnType<typeof removeFloorPlan>,
    @Inject(REGISTER_LISTING_PHOTO)
    private readonly registerPhotoUseCase: ReturnType<typeof registerListingPhoto>,
    @Inject(REMOVE_LISTING_PHOTO)
    private readonly removePhotoUseCase: ReturnType<typeof removeListingPhoto>,
    @Inject(REORDER_LISTING_PHOTOS)
    private readonly reorderPhotosUseCase: ReturnType<typeof reorderListingPhotos>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  private principal(auth: string | undefined) {
    return this.resolve({ authorization: auth, organizationId: null, requiredCapability: 'AGENT' });
  }

  private async view(principal: Awaited<ReturnType<AgentListingsController['principal']>>, listingId: string) {
    const view = await this.getListingUseCase({ principal, organizationId: null, listingId });
    return {
      ...toOwnerListingHttpResponse(view.listing, view.publishProblems),
      organizationId: view.access.organizationId,
      permissions: view.access.representation?.permissions ?? null,
    };
  }

  @Get(':id')
  async read(@Param('id') listingId: string, @Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    return this.view(principal, guid(listingId, 'listing'));
  }

  @Patch(':id/sale')
  async update(@Param('id') listingId: string, @Body() rawBody: unknown, @Headers('authorization') auth?: string) {
    const input = parse(updateSaleListingSchema, rawBody);
    const principal = await this.principal(auth);
    const result = await this.updateUseCase({
      principal,
      organizationId: null,
      listingId: guid(listingId, 'listing'),
      listing: defined(input.listing),
      ...(input.property ? { property: defined(input.property) } : {}),
    });
    return {
      ...(await this.view(principal, listingId)),
      pendingChangeProposal: result.proposal ? toChangeProposalHttpResponse(result.proposal) : null,
    };
  }

  @Get(':id/sale-terms')
  async terms(@Param('id') listingId: string, @Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    const terms = await this.getTermsUseCase({ principal, organizationId: null, listingId: guid(listingId, 'listing') });
    return toSaleTermsHttpResponse(terms);
  }

  @Put(':id/sale-terms')
  async saveTerms(@Param('id') listingId: string, @Body() rawBody: unknown, @Headers('authorization') auth?: string) {
    const input = parse(saleTermsSchema, rawBody);
    const principal = await this.principal(auth);
    const terms = await this.saveTermsUseCase({ principal, organizationId: null, listingId: guid(listingId, 'listing'), terms: input });
    return toSaleTermsHttpResponse(terms);
  }

  @Post(':id/photos')
  async registerPhoto(@Param('id') listingId: string, @Body() rawBody: unknown, @Headers('authorization') auth?: string) {
    const input = parse(registerPhotoSchema, rawBody);
    const principal = await this.principal(auth);
    return this.registerPhotoUseCase({
      principal,
      organizationId: null,
      listingId: guid(listingId, 'listing'),
      storagePath: input.storagePath,
    });
  }

  @Delete(':id/photos/:photoId')
  async removePhoto(
    @Param('id') listingId: string,
    @Param('photoId') photoId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(auth);
    return this.removePhotoUseCase({
      principal,
      organizationId: null,
      listingId: guid(listingId, 'listing'),
      photoId: guid(photoId, 'photo'),
    });
  }

  @Put(':id/photos/order')
  async reorderPhotos(@Param('id') listingId: string, @Body() rawBody: unknown, @Headers('authorization') auth?: string) {
    const input = parse(reorderPhotosSchema, rawBody);
    const principal = await this.principal(auth);
    await this.reorderPhotosUseCase({
      principal,
      organizationId: null,
      listingId: guid(listingId, 'listing'),
      photoIds: input.photoIds,
    });
    return this.view(principal, listingId);
  }

  @Post(':id/floor-plans')
  async addFloorPlan(@Param('id') listingId: string, @Body() rawBody: unknown, @Headers('authorization') auth?: string) {
    const input = parse(registerFloorPlanSchema, rawBody);
    const principal = await this.principal(auth);
    return this.registerFloorPlanUseCase({
      principal,
      organizationId: null,
      listingId: guid(listingId, 'listing'),
      storagePath: input.storagePath,
      label: input.label,
    });
  }

  @Delete(':id/floor-plans/:planId')
  async removeFloorPlan(
    @Param('id') listingId: string,
    @Param('planId') planId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(auth);
    return this.removeFloorPlanUseCase({
      principal,
      organizationId: null,
      listingId: guid(listingId, 'listing'),
      floorPlanId: guid(planId, 'floor plan'),
    });
  }
}
