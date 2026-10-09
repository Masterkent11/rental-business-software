import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Inject, Post, Query } from '@nestjs/common';
import type { ZodType } from 'zod';
import {
  LIST_POPULAR_AREAS,
  RECOMMEND_LISTINGS,
  RECORD_LISTING_VIEW,
  RESOLVE_LOCATION,
  SUGGEST_SEARCH,
} from '@/modules/discovery/discovery.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import {
  type resolvePrincipal,
  UnauthenticatedError,
} from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { suggestSearch } from '@/application/discovery/suggest-search/suggest-search.use-case.ts';
import type { listPopularAreas } from '@/application/discovery/list-popular-areas/list-popular-areas.use-case.ts';
import type { resolveLocation } from '@/application/discovery/resolve-location/resolve-location.use-case.ts';
import type { recommendListings } from '@/application/discovery/recommend-listings/recommend-listings.use-case.ts';
import type { recordListingView } from '@/application/discovery/record-listing-view/record-listing-view.use-case.ts';
import {
  listingViewSchema,
  popularAreasQuerySchema,
  recommendationQuerySchema,
  resolveLocationQuerySchema,
  suggestionQuerySchema,
} from '@/modules/discovery/dto/discovery.dto.ts';
import {
  toPopularAreaHttpResponse,
  toRecommendationsHttpResponse,
  toResolvedPlaceHttpResponse,
  toSuggestionsHttpResponse,
} from '@/modules/discovery/mappers/discovery-http.mapper.ts';

const parse = <T>(schema: ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value ?? {});
  if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid request');
  return parsed.data;
};

@Controller()
export class DiscoveryController {
  constructor(
    @Inject(SUGGEST_SEARCH) private readonly suggest: ReturnType<typeof suggestSearch>,
    @Inject(LIST_POPULAR_AREAS) private readonly popular: ReturnType<typeof listPopularAreas>,
    @Inject(RESOLVE_LOCATION) private readonly resolveLocationUseCase: ReturnType<typeof resolveLocation>,
    @Inject(RECOMMEND_LISTINGS) private readonly recommend: ReturnType<typeof recommendListings>,
    @Inject(RECORD_LISTING_VIEW) private readonly recordView: ReturnType<typeof recordListingView>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get('discovery/suggestions')
  async suggestions(@Query() raw: unknown) {
    const q = parse(suggestionQuerySchema, raw);
    return toSuggestionsHttpResponse(await this.suggest({ text: q.q, intent: q.intent ?? null }));
  }

  @Get('discovery/popular-areas')
  async popularAreas(@Query() raw: unknown) {
    const q = parse(popularAreasQuerySchema, raw);
    const areas = await this.popular({ intent: q.intent ?? null, city: q.city ?? null, limit: q.limit });
    return { items: areas.map(toPopularAreaHttpResponse) };
  }

  @Get('discovery/resolve-location')
  async resolveLocation(@Query() raw: unknown) {
    const q = parse(resolveLocationQuerySchema, raw);
    return toResolvedPlaceHttpResponse(await this.resolveLocationUseCase({ latitude: q.lat, longitude: q.lng }));
  }

  @Get('discovery/recommendations')
  async recommendations(@Query() raw: unknown, @Headers('authorization') auth?: string) {
    const q = parse(recommendationQuerySchema, raw);
    const principal = await this.optionalPrincipal(auth);
    const result = await this.recommend({
      intent: q.intent,
      origin: q.lat !== undefined && q.lng !== undefined ? { latitude: q.lat, longitude: q.lng } : null,
      city: q.city ?? null,
      propertyType: q.propertyType ?? null,
      userId: principal?.userId ?? null,
      limit: q.limit,
    });
    return toRecommendationsHttpResponse(result);
  }

  private async optionalPrincipal(authorization: string | undefined) {
    if (!authorization) return null;
    try {
      return await this.resolve({ authorization, organizationId: null });
    } catch (error) {
      if (error instanceof UnauthenticatedError) return null;
      throw error;
    }
  }

  @Post('me/listing-views')
  @HttpCode(202)
  async listingView(@Body() body: unknown, @Headers('authorization') auth?: string) {
    const input = parse(listingViewSchema, body);
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    return this.recordView({ principal, listingId: input.listingId });
  }
}
