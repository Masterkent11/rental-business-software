import { Module } from '@nestjs/common';
import { ViewAvailabilityController } from './controllers/view-availability.controller.ts';
import { PlaceHoldController } from './controllers/place-hold.controller.ts';
import { OCCUPANCY_REPOSITORY, PLACE_HOLD, VIEW_AVAILABILITY } from './booking.tokens.ts';
import { postgresOccupancyRepository } from '@/infrastructure/postgres/repositories/postgres-occupancy.repository.ts';
import { placeHold } from '@/application/bookings/place-hold/place-hold.use-case.ts';
import { viewAvailability } from '@/application/bookings/view-availability/view-availability.use-case.ts';
import type { OccupancyRepository } from '@/application/ports/repositories/occupancy-repository.port.ts';
import { IDENTITY_PROVIDER, RESOLVE_PRINCIPAL, USER_REPOSITORY } from '@/modules/me/me.tokens.ts';
import { jwksIdentityProvider } from '@/infrastructure/supabase/jwks-identity.provider.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { IdentityProvider } from '@/application/ports/providers/identity-provider.port.ts';
import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';

@Module({
  controllers: [ViewAvailabilityController, PlaceHoldController],
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
