import { Module } from '@nestjs/common';
import { SearchListingsController } from './controllers/search-listings.controller.ts';
import { ViewListingController } from './controllers/view-listing.controller.ts';
import { OwnerListingsController } from './controllers/owner-listings.controller.ts';
import {
  LISTING_REPOSITORY,
  SEARCH_LISTINGS,
  VIEW_LISTING,
  LIST_OWNER_LISTINGS,
  LIST_RESOURCES,
  CREATE_LISTING,
  UPLOAD_LISTING_PHOTO,
  SET_LISTING_STATE,
} from './listing.tokens.ts';
import { postgresListingRepository } from '@/infrastructure/postgres/repositories/postgres-listing.repository.ts';
import { searchListings } from '@/application/listings/search-listings/search-listings.use-case.ts';
import { viewListing } from '@/application/listings/view-listing/view-listing.use-case.ts';
import { listOwnerListings } from '@/application/listings/list-owner-listings/list-owner-listings.use-case.ts';
import { listResources } from '@/application/listings/list-owner-resources/list-owner-resources.use-case.ts';
import { createListing } from '@/application/listings/create-listing/create-listing.use-case.ts';
import { uploadListingPhoto } from '@/application/listings/upload-listing-photo/upload-listing-photo.use-case.ts';
import { setListingState } from '@/application/listings/set-listing-state/set-listing-state.use-case.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import { IDENTITY_PROVIDER, RESOLVE_PRINCIPAL, USER_REPOSITORY } from '@/modules/me/me.tokens.ts';
import { jwksIdentityProvider } from '@/infrastructure/supabase/jwks-identity.provider.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { IdentityProvider } from '@/application/ports/providers/identity-provider.port.ts';
import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';

@Module({
  controllers: [
    SearchListingsController,
    ViewListingController,
    OwnerListingsController,
  ],
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
      provide: CREATE_LISTING,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => createListing(repo),
    },
    {
      provide: UPLOAD_LISTING_PHOTO,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => uploadListingPhoto(repo),
    },
    {
      provide: SET_LISTING_STATE,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => setListingState(repo),
    },
    { provide: IDENTITY_PROVIDER, useFactory: (): IdentityProvider => jwksIdentityProvider() },
    { provide: USER_REPOSITORY, useFactory: (): UserRepository => postgresUserRepository() },
    {
      provide: RESOLVE_PRINCIPAL,
      inject: [IDENTITY_PROVIDER, USER_REPOSITORY],
      useFactory: (identity: IdentityProvider, users: UserRepository) =>
        resolvePrincipal(identity, users),
    },
  ],
})
export class ListingsModule {}
