import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { DiscoveryRepository } from '@/application/ports/repositories/discovery-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import {
  EMPTY_INTEREST,
  NEARBY_RADIUS_KM,
  buildInterestProfile,
  rankRecommendations,
  type RecommendationCandidate,
} from '@/domain/discovery/recommendation.ts';
import { isPublic, type Listing, type ListingIntent, type ListingQuery, type PropertyType } from '@/domain/listings/listing.ts';
import type { Coordinates } from '@/domain/shared/geo.ts';
import { PUBLIC } from '@/domain/shared/organization-scope.ts';

export type RecommendationScope = 'CITY' | 'NEARBY' | 'BROAD';

export interface RecommendListingsInput {
  readonly intent: ListingIntent;
  readonly origin: Coordinates | null;
  readonly city: string | null;
  readonly propertyType: PropertyType | null;
  readonly userId: string | null;
  readonly limit: number;
}

export interface RecommendListingsResult {
  readonly scope: RecommendationScope;
  readonly items: readonly Listing[];
}

export const CANDIDATE_POOL_SIZE = 120;
export const INTEREST_LOOKBACK_DAYS = 120;

type RankedListing = RecommendationCandidate & { readonly listing: Listing };

const toCandidate = (listing: Listing): RankedListing => ({
  listing,
  id: listing.id,
  intent: listing.intent,
  propertyId: listing.propertyId ?? null,
  propertyType: listing.propertyType ?? null,
  areaLabel: listing.areaLabel,
  cityLabel: listing.cityLabel,
  distanceKm: listing.distanceKm ?? null,
  photoCount: listing.photos.length,
  hasTour: listing.hasTour,
  descriptionLength: listing.description.length,
  hasLocation: Boolean(listing.publicLocation),
  isAvailable: listing.intent === 'SALE' || listing.kind === 'SHORT_TERM' || Boolean(listing.nextAvailableOn),
  publishedAt: listing.publishedAt ?? null,
});

export const recommendListings =
  (listings: ListingRepository, discovery: DiscoveryRepository, clock: Clock) =>
  async (input: RecommendListingsInput): Promise<RecommendListingsResult> => {
    const now = clock.now();
    const base: ListingQuery = {
      intent: input.intent,
      ...(input.propertyType ? { propertyType: input.propertyType } : {}),
      limit: CANDIDATE_POOL_SIZE,
      offset: 0,
    };

    const since = new Date(now.getTime() - INTEREST_LOOKBACK_DAYS * 86_400_000);
    const interestPromise = input.userId
      ? discovery.interestSignals(input.userId, since).then((signals) => buildInterestProfile(signals, input.intent))
      : Promise.resolve(EMPTY_INTEREST);

    let scope: RecommendationScope;
    let pool: readonly Listing[];
    if (input.city) {
      scope = 'CITY';
      pool = (await listings.search(PUBLIC, { ...base, city: input.city, sort: 'NEWEST' })).items;
    } else if (input.origin) {
      const nearby = await listings.search(PUBLIC, {
        ...base,
        near: { ...input.origin, radiusKm: NEARBY_RADIUS_KM },
        sort: 'DISTANCE',
      });
      scope = nearby.items.length > 0 ? 'NEARBY' : 'BROAD';
      pool = nearby.items.length > 0 ? nearby.items : (await listings.search(PUBLIC, { ...base, sort: 'NEWEST' })).items;
    } else {
      scope = 'BROAD';
      pool = (await listings.search(PUBLIC, { ...base, sort: 'NEWEST' })).items;
    }

    const interest = await interestPromise;
    const ranked = rankRecommendations(
      pool.filter(isPublic).map(toCandidate),
      {
        intent: input.intent,
        explicitCity: input.city,
        hasOrigin: scope === 'NEARBY',
        interest,
        now,
      },
      Math.min(Math.max(input.limit, 1), 30),
    );
    return { scope, items: ranked.map((candidate) => candidate.listing) };
  };
