import { Module } from '@nestjs/common';
import { SearchListingsController } from './controllers/search-listings.controller.ts';
import { ViewListingController } from './controllers/view-listing.controller.ts';
import { OwnerListingsController } from './controllers/owner-listings.controller.ts';
import { OwnerSaleListingsController } from './controllers/owner-sale-listings.controller.ts';
import { AgentListingsController } from './controllers/agent-listings.controller.ts';
import { LocationsController } from './controllers/locations.controller.ts';
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
  CREATE_SALE_LISTING,
  UPDATE_SALE_LISTING,
  GET_SALE_TERMS,
  SAVE_SALE_TERMS,
  REGISTER_FLOOR_PLAN,
  REMOVE_FLOOR_PLAN,
  LIST_AREAS,
  GET_PARTNER_LISTING,
} from './listing.tokens.ts';
import { OCCUPANCY_REPOSITORY } from '@/modules/bookings/booking.tokens.ts';
import { BOOKING_REPOSITORY, LISTING_GATE, LISTING_MEDIA_STORAGE } from '@/modules/shared/shared.tokens.ts';
import type { ListingGate } from '@/application/identity/partner-access.rules.ts';
import { createSaleListing } from '@/application/listings/create-sale-listing/create-sale-listing.use-case.ts';
import { updateSaleListing } from '@/application/listings/update-sale-listing/update-sale-listing.use-case.ts';
import { getSaleTerms } from '@/application/listings/get-sale-terms/get-sale-terms.use-case.ts';
import { saveSaleTerms } from '@/application/listings/save-sale-terms/save-sale-terms.use-case.ts';
import { registerFloorPlan } from '@/application/listings/register-floor-plan/register-floor-plan.use-case.ts';
import { removeFloorPlan } from '@/application/listings/remove-floor-plan/remove-floor-plan.use-case.ts';
import { listAreas } from '@/application/listings/list-areas/list-areas.use-case.ts';
import { getPartnerListing } from '@/application/listings/get-partner-listing/get-partner-listing.use-case.ts';
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
  controllers: [
    SearchListingsController,
    ViewListingController,
    OwnerListingsController,
    OwnerSaleListingsController,
    AgentListingsController,
    LocationsController,
  ],
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
      inject: [LISTING_REPOSITORY, LISTING_MEDIA_STORAGE, LISTING_GATE],
      useFactory: (repo: ListingRepository, media: ListingMediaStorage, gate: ListingGate) =>
        registerListingPhoto(repo, media, gate),
    },
    {
      provide: REMOVE_LISTING_PHOTO,
      inject: [LISTING_REPOSITORY, LISTING_GATE],
      useFactory: (repo: ListingRepository, gate: ListingGate) => removeListingPhoto(repo, gate),
    },
    {
      provide: REORDER_LISTING_PHOTOS,
      inject: [LISTING_REPOSITORY, LISTING_GATE],
      useFactory: (repo: ListingRepository, gate: ListingGate) => reorderListingPhotos(repo, gate),
    },
    {
      provide: CREATE_SALE_LISTING,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => createSaleListing(repo),
    },
    {
      provide: UPDATE_SALE_LISTING,
      inject: [LISTING_REPOSITORY, LISTING_GATE],
      useFactory: (repo: ListingRepository, gate: ListingGate) => updateSaleListing(repo, gate),
    },
    {
      provide: GET_SALE_TERMS,
      inject: [LISTING_REPOSITORY, LISTING_GATE],
      useFactory: (repo: ListingRepository, gate: ListingGate) => getSaleTerms(repo, gate),
    },
    {
      provide: SAVE_SALE_TERMS,
      inject: [LISTING_REPOSITORY, LISTING_GATE],
      useFactory: (repo: ListingRepository, gate: ListingGate) => saveSaleTerms(repo, gate),
    },
    {
      provide: REGISTER_FLOOR_PLAN,
      inject: [LISTING_REPOSITORY, LISTING_MEDIA_STORAGE, LISTING_GATE],
      useFactory: (repo: ListingRepository, media: ListingMediaStorage, gate: ListingGate) =>
        registerFloorPlan(repo, media, gate),
    },
    {
      provide: REMOVE_FLOOR_PLAN,
      inject: [LISTING_REPOSITORY, LISTING_GATE],
      useFactory: (repo: ListingRepository, gate: ListingGate) => removeFloorPlan(repo, gate),
    },
    {
      provide: LIST_AREAS,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => listAreas(repo),
    },
    {
      provide: GET_PARTNER_LISTING,
      inject: [LISTING_REPOSITORY, LISTING_GATE],
      useFactory: (repo: ListingRepository, gate: ListingGate) => getPartnerListing(repo, gate),
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
