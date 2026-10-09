import { Module } from '@nestjs/common';
import { DiscoveryController } from './controllers/discovery.controller.ts';
import {
  DISCOVERY_REPOSITORY,
  LIST_POPULAR_AREAS,
  RECOMMEND_LISTINGS,
  RECORD_LISTING_VIEW,
  RESOLVE_LOCATION,
  SUGGEST_SEARCH,
} from './discovery.tokens.ts';
import { CLOCK, SHARED_LISTING_REPOSITORY } from '@/modules/shared/shared.tokens.ts';
import { postgresDiscoveryRepository } from '@/infrastructure/postgres/repositories/postgres-discovery.repository.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { DiscoveryRepository } from '@/application/ports/repositories/discovery-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import { suggestSearch } from '@/application/discovery/suggest-search/suggest-search.use-case.ts';
import { listPopularAreas } from '@/application/discovery/list-popular-areas/list-popular-areas.use-case.ts';
import { resolveLocation } from '@/application/discovery/resolve-location/resolve-location.use-case.ts';
import { recommendListings } from '@/application/discovery/recommend-listings/recommend-listings.use-case.ts';
import { recordListingView } from '@/application/discovery/record-listing-view/record-listing-view.use-case.ts';

@Module({
  controllers: [DiscoveryController],
  providers: [
    { provide: DISCOVERY_REPOSITORY, useFactory: () => postgresDiscoveryRepository() },
    { provide: SUGGEST_SEARCH, inject: [DISCOVERY_REPOSITORY], useFactory: (d: DiscoveryRepository) => suggestSearch(d) },
    { provide: LIST_POPULAR_AREAS, inject: [DISCOVERY_REPOSITORY], useFactory: (d: DiscoveryRepository) => listPopularAreas(d) },
    { provide: RESOLVE_LOCATION, inject: [DISCOVERY_REPOSITORY], useFactory: (d: DiscoveryRepository) => resolveLocation(d) },
    {
      provide: RECOMMEND_LISTINGS,
      inject: [SHARED_LISTING_REPOSITORY, DISCOVERY_REPOSITORY, CLOCK],
      useFactory: (l: ListingRepository, d: DiscoveryRepository, c: Clock) => recommendListings(l, d, c),
    },
    { provide: RECORD_LISTING_VIEW, inject: [DISCOVERY_REPOSITORY], useFactory: (d: DiscoveryRepository) => recordListingView(d) },
  ],
})
export class DiscoveryModule {}
