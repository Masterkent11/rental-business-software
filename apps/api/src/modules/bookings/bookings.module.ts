import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller.ts';
import { OCCUPANCY_REPOSITORY, PLACE_HOLD, VIEW_AVAILABILITY } from './booking.tokens.ts';
import { postgresOccupancyRepository } from '../../infrastructure/postgres/occupancy-repository.pg.ts';
import { placeHold, viewAvailability } from '../../features/book-resource/place-hold.ts';
import type { OccupancyRepository } from '../../application/ports/occupancy-repository.ts';
import { IDENTITY_PROVIDER, RESOLVE_PRINCIPAL, USER_REPOSITORY } from '../me/me.tokens.ts';
import { jwksIdentityProvider } from '../../infrastructure/supabase/jwks-identity-provider.ts';
import { postgresUserRepository } from '../../infrastructure/postgres/user-repository.pg.ts';
import { resolvePrincipal } from '../../features/authenticate/resolve-principal.ts';
import type { IdentityProvider } from '../../application/ports/identity-provider.ts';
import type { UserRepository } from '../../application/ports/user-repository.ts';

@Module({
  controllers: [BookingsController],
  providers: [
    {
      provide: OCCUPANCY_REPOSITORY,
      useFactory: (): OccupancyRepository => postgresOccupancyRepository(),
    },
    {
      provide: PLACE_HOLD,
      inject: [OCCUPANCY_REPOSITORY],
      useFactory: (repo: OccupancyRepository) => placeHold(repo),
    },
    { provide: IDENTITY_PROVIDER, useFactory: (): IdentityProvider => jwksIdentityProvider() },
    { provide: USER_REPOSITORY, useFactory: (): UserRepository => postgresUserRepository() },
    {
      provide: RESOLVE_PRINCIPAL,
      inject: [IDENTITY_PROVIDER, USER_REPOSITORY],
      useFactory: (identity: IdentityProvider, users: UserRepository) =>
        resolvePrincipal(identity, users),
    },
    {
      provide: VIEW_AVAILABILITY,
      inject: [OCCUPANCY_REPOSITORY],
      useFactory: (repo: OccupancyRepository) => viewAvailability(repo),
    },
  ],
})
export class BookingsModule {}
