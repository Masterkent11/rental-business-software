import { Module } from '@nestjs/common';
import { GetMeController } from './controllers/get-me.controller.ts';
import { GetMyStaysController } from './controllers/get-my-stays.controller.ts';
import { SavedListingsController } from './controllers/saved-listings.controller.ts';
import {
  IDENTITY_PROVIDER,
  RESOLVE_PRINCIPAL,
  USER_REPOSITORY,
  GET_MY_STAYS,
  GET_SAVED_LISTINGS,
  SAVE_LISTING,
  UNSAVE_LISTING,
} from './me.tokens.ts';
import { jwksIdentityProvider } from '@/infrastructure/supabase/jwks-identity.provider.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import { getMyStays } from '@/application/me/get-my-stays/get-my-stays.use-case.ts';
import { getSavedListings } from '@/application/me/get-saved-listings/get-saved-listings.use-case.ts';
import { saveListing } from '@/application/me/save-listing/save-listing.use-case.ts';
import { unsaveListing } from '@/application/me/unsave-listing/unsave-listing.use-case.ts';
import type { IdentityProvider } from '@/application/ports/providers/identity-provider.port.ts';
import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';

@Module({
  controllers: [GetMeController, GetMyStaysController, SavedListingsController],
  providers: [
    {
      provide: IDENTITY_PROVIDER,
      useFactory: (): IdentityProvider => jwksIdentityProvider(),
    },
    {
      provide: USER_REPOSITORY,
      useFactory: (): UserRepository => postgresUserRepository(),
    },
    {
      provide: RESOLVE_PRINCIPAL,
      inject: [IDENTITY_PROVIDER, USER_REPOSITORY],
      useFactory: (identity: IdentityProvider, users: UserRepository) =>
        resolvePrincipal(identity, users),
    },
    {
      provide: GET_MY_STAYS,
      inject: [USER_REPOSITORY],
      useFactory: (users: UserRepository) => getMyStays(users),
    },
    {
      provide: GET_SAVED_LISTINGS,
      inject: [USER_REPOSITORY],
      useFactory: (users: UserRepository) => getSavedListings(users),
    },
    {
      provide: SAVE_LISTING,
      inject: [USER_REPOSITORY],
      useFactory: (users: UserRepository) => saveListing(users),
    },
    {
      provide: UNSAVE_LISTING,
      inject: [USER_REPOSITORY],
      useFactory: (users: UserRepository) => unsaveListing(users),
    },
  ],
})
export class MeModule {}
