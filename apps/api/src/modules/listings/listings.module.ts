import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller.ts';
import { LISTING_REPOSITORY, SEARCH_LISTINGS, VIEW_LISTING } from './listing.tokens.ts';
import { postgresListingRepository } from '../../infrastructure/postgres/listing-repository.pg.ts';
import { searchListings, viewListing } from '../../features/search-listings/search-listings.ts';
import type { ListingRepository } from '../../application/ports/listing-repository.ts';

/**
 * Composition for the listings module.
 *
 * This file is the only place that knows both that a use case exists and that
 * Postgres implements its port. Swapping the adapter is a change to one
 * `useFactory` here — which is the whole of what ADR-0001 meant by keeping the
 * platform replaceable.
 *
 * Note the absence of `@Injectable()` anywhere below the presentation layer:
 * the use cases are plain functions, built by factories and handed their port.
 */
@Module({
  controllers: [ListingsController],
  providers: [
    {
      provide: LISTING_REPOSITORY,
      useFactory: (): ListingRepository => postgresListingRepository(),
    },
    {
      provide: SEARCH_LISTINGS,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => searchListings(repo),
    },
    {
      provide: VIEW_LISTING,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => viewListing(repo),
    },
  ],
})
export class ListingsModule {}
