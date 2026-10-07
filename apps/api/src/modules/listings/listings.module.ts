import { Module } from '@nestjs/common';
import { SearchListingsController } from './controllers/search-listings.controller.ts';
import { ViewListingController } from './controllers/view-listing.controller.ts';
import { OwnerListingsController } from './controllers/owner-listings.controller.ts';
import {
  ADD_AVAILABILITY_BLOCK,
  CREATE_LISTING,
  CREATE_PROPERTY_LISTING,
  GET_LISTING_CALENDAR,
  GET_OWNER_LISTING,
  LISTING_REPOSITORY,
  LIST_OWNER_LISTINGS,
  LIST_OWNER_PROPERTIES,
  LIST_RESOURCES,
  QUOTE_STAY,
  REGISTER_LISTING_PHOTO,
  REMOVE_AVAILABILITY_BLOCK,
  REMOVE_LISTING_PHOTO,
  REORDER_LISTING_PHOTOS,
  SEARCH_LISTINGS,
  SET_LISTING_STATE,
  UPDATE_LISTING,
  VIEW_LISTING,
} from './listing.tokens.ts';
import { OCCUPANCY_REPOSITORY } from '@/modules/bookings/booking.tokens.ts';
import { BOOKING_REPOSITORY, LISTING_MEDIA_STORAGE } from '@/modules/shared/shared.tokens.ts';
import { postgresListingRepository } from '@/infrastructure/postgres/repositories/postgres-listing.repository.ts';
import { postgresOccupancyRepository } from '@/infrastructure/postgres/repositories/postgres-occupancy.repository.ts';
import { searchListings } from '@/application/listings/search-listings/search-listings.use-case.ts';
import { viewListing } from '@/application/listings/view-listing/view-listing.use-case.ts';
import { quoteStayForListing } from '@/application/listings/quote-stay/quote-stay.use-case.ts';
import { listOwnerListings } from '@/application/listings/list-owner-listings/list-owner-listings.use-case.ts';
import { listResources } from '@/application/listings/list-owner-resources/list-owner-resources.use-case.ts';
import { listOwnerProperties } from '@/application/listings/list-owner-properties/list-owner-properties.use-case.ts';
import { getOwnerListing } from '@/application/listings/get-owner-listing/get-owner-listing.use-case.ts';
import { createListing } from '@/application/listings/create-listing/create-listing.use-case.ts';
import { createPropertyListing } from '@/application/listings/create-property-listing/create-property-listing.use-case.ts';
import { updateListing } from '@/application/listings/update-listing/update-listing.use-case.ts';
import { registerListingPhoto } from '@/application/listings/register-listing-photo/register-listing-photo.use-case.ts';
import { removeListingPhoto } from '@/application/listings/remove-listing-photo/remove-listing-photo.use-case.ts';
import { reorderListingPhotos } from '@/application/listings/reorder-listing-photos/reorder-listing-photos.use-case.ts';
import { setListingState } from '@/application/listings/set-listing-state/set-listing-state.use-case.ts';
import {
  addAvailabilityBlock,
  getListingCalendar,
  removeAvailabilityBlock,
} from '@/application/bookings/manage-availability-blocks/manage-availability-blocks.use-case.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { OccupancyRepository } from '@/application/ports/repositories/occupancy-repository.port.ts';
import type { BookingRepository } from '@/application/ports/repositories/booking-repository.port.ts';
import type { ListingMediaStorage } from '@/application/ports/storage/listing-media.port.ts';

@Module({
  controllers: [SearchListingsController, ViewListingController, OwnerListingsController],
  providers: [
    { provide: LISTING_REPOSITORY, useFactory: (): ListingRepository => postgresListingRepository() },
    { provide: OCCUPANCY_REPOSITORY, useFactory: (): OccupancyRepository => postgresOccupancyRepository() },
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
    {
      provide: QUOTE_STAY,
      inject: [LISTING_REPOSITORY, OCCUPANCY_REPOSITORY],
      useFactory: (repo: ListingRepository, occupancies: OccupancyRepository) =>
        quoteStayForListing(repo, occupancies),
    },
    {
      provide: LIST_OWNER_LISTINGS,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => listOwnerListings(repo),
    },
    {
      provide: LIST_RESOURCES,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => listResources(repo),
    },
    {
      provide: LIST_OWNER_PROPERTIES,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => listOwnerProperties(repo),
    },
    {
      provide: GET_OWNER_LISTING,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => getOwnerListing(repo),
    },
    {
      provide: CREATE_LISTING,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => createListing(repo),
    },
    {
      provide: CREATE_PROPERTY_LISTING,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => createPropertyListing(repo),
    },
    {
      provide: UPDATE_LISTING,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => updateListing(repo),
    },
    {
      provide: REGISTER_LISTING_PHOTO,
      inject: [LISTING_REPOSITORY, LISTING_MEDIA_STORAGE],
      useFactory: (repo: ListingRepository, media: ListingMediaStorage) => registerListingPhoto(repo, media),
    },
    {
      provide: REMOVE_LISTING_PHOTO,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => removeListingPhoto(repo),
    },
    {
      provide: REORDER_LISTING_PHOTOS,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => reorderListingPhotos(repo),
    },
    {
      provide: SET_LISTING_STATE,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => setListingState(repo),
    },
    {
      provide: GET_LISTING_CALENDAR,
      inject: [LISTING_REPOSITORY, OCCUPANCY_REPOSITORY, BOOKING_REPOSITORY],
      useFactory: (repo: ListingRepository, occupancies: OccupancyRepository, bookings: BookingRepository) =>
        getListingCalendar(repo, occupancies, bookings),
    },
    {
      provide: ADD_AVAILABILITY_BLOCK,
      inject: [LISTING_REPOSITORY, BOOKING_REPOSITORY],
      useFactory: (repo: ListingRepository, bookings: BookingRepository) => addAvailabilityBlock(repo, bookings),
    },
    {
      provide: REMOVE_AVAILABILITY_BLOCK,
      inject: [BOOKING_REPOSITORY],
      useFactory: (bookings: BookingRepository) => removeAvailabilityBlock(bookings),
    },
  ],
})
export class ListingsModule {}
