import { Module } from '@nestjs/common';
import { ToursController } from './tours.controller.ts';
import { TourAuthoringController } from './tour-authoring.controller.ts';
import { MEDIA_STORAGE, PANORAMA_PROCESSOR, TOUR_REPOSITORY } from './tour.tokens.ts';
import { IDENTITY_PROVIDER, RESOLVE_PRINCIPAL, USER_REPOSITORY } from '../me/me.tokens.ts';
import { postgresTourRepository } from '../../infrastructure/postgres/tour-repository.pg.ts';
import { supabaseMediaStorage } from '../../infrastructure/storage/supabase-media-storage.ts';
import { sharpPanoramaProcessor } from '../../infrastructure/media/sharp-panorama-processor.ts';
import { jwksIdentityProvider } from '../../infrastructure/supabase/jwks-identity-provider.ts';
import { postgresUserRepository } from '../../infrastructure/postgres/user-repository.pg.ts';
import { resolvePrincipal } from '../../features/authenticate/resolve-principal.ts';
import type { TourRepository } from '../../application/ports/tour-repository.ts';
import type { MediaStorage } from '../../application/ports/media-storage.ts';
import type { PanoramaProcessor } from '../../application/ports/panorama-processor.ts';
import type { IdentityProvider } from '../../application/ports/identity-provider.ts';
import type { UserRepository } from '../../application/ports/user-repository.ts';

/**
 * Composition for tours: one repository, read by customers and written by
 * owners. There is deliberately no second tour model for authoring.
 */
@Module({
  controllers: [ToursController, TourAuthoringController],
  providers: [
    { provide: TOUR_REPOSITORY, useFactory: (): TourRepository => postgresTourRepository() },
    { provide: MEDIA_STORAGE, useFactory: (): MediaStorage => supabaseMediaStorage() },
    { provide: PANORAMA_PROCESSOR, useFactory: (): PanoramaProcessor => sharpPanoramaProcessor() },
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
export class ToursModule {}
