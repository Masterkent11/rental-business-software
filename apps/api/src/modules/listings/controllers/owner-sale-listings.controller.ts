import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { z } from 'zod';
import {
  CREATE_SALE_LISTING,
  GET_OWNER_LISTING,
  GET_SALE_TERMS,
  REGISTER_FLOOR_PLAN,
  REMOVE_FLOOR_PLAN,
  SAVE_SALE_TERMS,
  UPDATE_SALE_LISTING,
  DECIDE_CHANGE_PROPOSAL,
  LIST_CHANGE_PROPOSALS,
} from '@/modules/listings/listing.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { createSaleListing } from '@/application/listings/create-sale-listing/create-sale-listing.use-case.ts';
import type { updateSaleListing } from '@/application/listings/update-sale-listing/update-sale-listing.use-case.ts';
import type { getSaleTerms } from '@/application/listings/get-sale-terms/get-sale-terms.use-case.ts';
import type { saveSaleTerms } from '@/application/listings/save-sale-terms/save-sale-terms.use-case.ts';
import type { registerFloorPlan } from '@/application/listings/register-floor-plan/register-floor-plan.use-case.ts';
import type { removeFloorPlan } from '@/application/listings/remove-floor-plan/remove-floor-plan.use-case.ts';
import type { getOwnerListing } from '@/application/listings/get-owner-listing/get-owner-listing.use-case.ts';
import {
  createSaleListingSchema,
  registerFloorPlanSchema,
  saleTermsSchema,
  updateSaleListingSchema,
  proposalDecisionSchema,
} from '@/modules/listings/dto/owner-listing.dto.ts';
import {
  toChangeProposalHttpResponse,
  toOwnerListingHttpResponse,
  toSaleTermsHttpResponse,
} from '@/modules/listings/mappers/listing-http.mapper.ts';
import type {
  decideChangeProposal,
  listChangeProposals,
} from '@/application/listings/review-change-proposal/review-change-proposal.use-case.ts';

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

@Controller('organizations/:organizationId')
export class OwnerSaleListingsController {
  constructor(
    @Inject(CREATE_SALE_LISTING)
    private readonly createUseCase: ReturnType<typeof createSaleListing>,
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
    @Inject(GET_OWNER_LISTING)
    private readonly getListingUseCase: ReturnType<typeof getOwnerListing>,
    @Inject(LIST_CHANGE_PROPOSALS)
    private readonly listProposals: ReturnType<typeof listChangeProposals>,
    @Inject(DECIDE_CHANGE_PROPOSAL)
    private readonly decideProposal: ReturnType<typeof decideChangeProposal>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get('listing-change-proposals')
  async proposals(@Param('organizationId') organizationId: string, @Headers('authorization') auth?: string) {
    const principal = await this.principal(organizationId, auth);
    const rows = await this.listProposals({ principal, organizationId });
    return { items: rows.map(toChangeProposalHttpResponse) };
  }

  @Post('listing-change-proposals/:id/decision')
  @HttpCode(200)
  async decide(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(proposalDecisionSchema, rawBody);
    const principal = await this.principal(organizationId, auth);
    return toChangeProposalHttpResponse(
      await this.decideProposal({ principal, organizationId, proposalId: guid(id, 'proposal'), approve: input.approve }),
    );
  }

  private principal(organizationId: string, auth: string | undefined) {
    return this.resolve({ authorization: auth, organizationId: guid(organizationId, 'organization') });
  }

  @Post('sale-listings')
  async create(
    @Param('organizationId') organizationId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(createSaleListingSchema, rawBody);
    const principal = await this.principal(organizationId, auth);
    const created = await this.createUseCase({
      principal,
      organizationId,
      property: input.property,
      listing: input.listing,
      saleTerms: input.saleTerms,
      confirmDistinctProperty: input.confirmDistinctProperty,
    });
    const view = await this.getListingUseCase({ principal, organizationId, listingId: created.id });
    return toOwnerListingHttpResponse(view.listing, view.publishProblems);
  }

  @Patch('sale-listings/:id')
  async update(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(updateSaleListingSchema, rawBody);
    const principal = await this.principal(organizationId, auth);
    await this.updateUseCase({
      principal,
      organizationId,
      listingId: guid(listingId, 'listing'),
      listing: defined(input.listing),
      ...(input.property ? { property: defined(input.property) } : {}),
    });
    const view = await this.getListingUseCase({ principal, organizationId, listingId });
    return toOwnerListingHttpResponse(view.listing, view.publishProblems);
  }

  @Get('listings/:id/sale-terms')
  async terms(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(organizationId, auth);
    const terms = await this.getTermsUseCase({ principal, organizationId, listingId: guid(listingId, 'listing') });
    return toSaleTermsHttpResponse(terms);
  }

  @Put('listings/:id/sale-terms')
  async saveTerms(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(saleTermsSchema, rawBody);
    const principal = await this.principal(organizationId, auth);
    const terms = await this.saveTermsUseCase({
      principal,
      organizationId,
      listingId: guid(listingId, 'listing'),
      terms: input,
    });
    return toSaleTermsHttpResponse(terms);
  }

  @Post('listings/:id/floor-plans')
  async addFloorPlan(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(registerFloorPlanSchema, rawBody);
    const principal = await this.principal(organizationId, auth);
    return this.registerFloorPlanUseCase({
      principal,
      organizationId,
      listingId: guid(listingId, 'listing'),
      storagePath: input.storagePath,
      label: input.label,
    });
  }

  @Delete('listings/:id/floor-plans/:planId')
  async removeFloorPlan(
    @Param('organizationId') organizationId: string,
    @Param('id') listingId: string,
    @Param('planId') planId: string,
    @Headers('authorization') auth?: string,
  ) {
    const principal = await this.principal(organizationId, auth);
    return this.removeFloorPlanUseCase({
      principal,
      organizationId,
      listingId: guid(listingId, 'listing'),
      floorPlanId: guid(planId, 'floor plan'),
    });
  }
}
