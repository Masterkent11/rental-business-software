import { Module } from '@nestjs/common';
import { ViewTourController } from './controllers/view-tour.controller.ts';
import { AuthorTourController } from './controllers/author-tour.controller.ts';
import {
  MEDIA_STORAGE,
  PANORAMA_PROCESSOR,
  TOUR_REPOSITORY,
  GET_RESOURCE_TOUR,
  GET_TOUR_TILE_URL,
  CREATE_OWNER_TOUR_FOR_RESOURCE,
  GET_OWNER_TOUR_WITH_READINESS,
  ADD_OWNER_SCENE_WITH_PANORAMA,
  REORDER_OWNER_SCENES,
  RENAME_OWNER_SCENE,
  SET_OWNER_ENTRY_SCENE,
  ADD_OWNER_HOTSPOT,
  REMOVE_OWNER_HOTSPOT,
  PUBLISH_OWNER_TOUR,
  UNPUBLISH_OWNER_TOUR,
} from './tour.tokens.ts';
import { IDENTITY_PROVIDER, RESOLVE_PRINCIPAL, USER_REPOSITORY } from '@/modules/me/me.tokens.ts';
import { postgresTourRepository } from '@/infrastructure/postgres/repositories/postgres-tour.repository.ts';
import { supabaseMediaStorage } from '@/infrastructure/storage/supabase-media-storage.adapter.ts';
import { sharpPanoramaProcessor } from '@/infrastructure/media/sharp-panorama-processor.adapter.ts';
import { jwksIdentityProvider } from '@/infrastructure/supabase/jwks-identity.provider.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { MediaStorage } from '@/application/ports/storage/media-storage.port.ts';
import type { PanoramaProcessor } from '@/application/ports/providers/panorama-processor.port.ts';
import type { IdentityProvider } from '@/application/ports/providers/identity-provider.port.ts';
import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';

// Use Cases
import { getResourceTour, getTourTileUrl } from '@/application/tours/view-tour/view-tour.use-case.ts';
import { createOwnerTourForResource } from '@/application/tours/create-owner-tour/create-owner-tour.use-case.ts';
import { getOwnerTourWithReadiness } from '@/application/tours/get-owner-tour/get-owner-tour.use-case.ts';
import { addOwnerSceneWithPanorama } from '@/application/tours/add-scene/add-scene.use-case.ts';
import { reorderOwnerScenes } from '@/application/tours/reorder-scenes/reorder-scenes.use-case.ts';
import { renameOwnerScene } from '@/application/tours/rename-scene/rename-scene.use-case.ts';
import { setOwnerEntryScene } from '@/application/tours/set-entry-scene/set-entry-scene.use-case.ts';
import { addOwnerHotspot } from '@/application/tours/add-hotspot/add-hotspot.use-case.ts';
import { removeOwnerHotspot } from '@/application/tours/remove-hotspot/remove-hotspot.use-case.ts';
import { publishOwnerTour } from '@/application/tours/publish-tour/publish-tour.use-case.ts';
import { unpublishOwnerTour } from '@/application/tours/unpublish-tour/unpublish-tour.use-case.ts';

@Module({
  controllers: [ViewTourController, AuthorTourController],
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

    // Public Tour Use Cases
    {
      provide: GET_RESOURCE_TOUR,
      inject: [TOUR_REPOSITORY, MEDIA_STORAGE],
      useFactory: (tours: TourRepository, storage: MediaStorage) => getResourceTour(tours, storage),
    },
    {
      provide: GET_TOUR_TILE_URL,
      inject: [TOUR_REPOSITORY, MEDIA_STORAGE],
      useFactory: (tours: TourRepository, storage: MediaStorage) => getTourTileUrl(tours, storage),
    },

    // Owner Tour Use Cases
    {
      provide: CREATE_OWNER_TOUR_FOR_RESOURCE,
      inject: [TOUR_REPOSITORY],
      useFactory: (tours: TourRepository) => createOwnerTourForResource(tours),
    },
    {
      provide: GET_OWNER_TOUR_WITH_READINESS,
      inject: [TOUR_REPOSITORY],
      useFactory: (tours: TourRepository) => getOwnerTourWithReadiness(tours),
    },
    {
      provide: ADD_OWNER_SCENE_WITH_PANORAMA,
      inject: [TOUR_REPOSITORY, PANORAMA_PROCESSOR, MEDIA_STORAGE],
      useFactory: (tours: TourRepository, proc: PanoramaProcessor, storage: MediaStorage) =>
        addOwnerSceneWithPanorama(tours, proc, storage),
    },
    {
      provide: REORDER_OWNER_SCENES,
      inject: [TOUR_REPOSITORY],
      useFactory: (tours: TourRepository) => reorderOwnerScenes(tours),
    },
    {
      provide: RENAME_OWNER_SCENE,
      inject: [TOUR_REPOSITORY],
      useFactory: (tours: TourRepository) => renameOwnerScene(tours),
    },
    {
      provide: SET_OWNER_ENTRY_SCENE,
      inject: [TOUR_REPOSITORY],
      useFactory: (tours: TourRepository) => setOwnerEntryScene(tours),
    },
    {
      provide: ADD_OWNER_HOTSPOT,
      inject: [TOUR_REPOSITORY],
      useFactory: (tours: TourRepository) => addOwnerHotspot(tours),
    },
    {
      provide: REMOVE_OWNER_HOTSPOT,
      inject: [TOUR_REPOSITORY],
      useFactory: (tours: TourRepository) => removeOwnerHotspot(tours),
    },
    {
      provide: PUBLISH_OWNER_TOUR,
      inject: [TOUR_REPOSITORY],
      useFactory: (tours: TourRepository) => publishOwnerTour(tours),
    },
    {
      provide: UNPUBLISH_OWNER_TOUR,
      inject: [TOUR_REPOSITORY],
      useFactory: (tours: TourRepository) => unpublishOwnerTour(tours),
    },
  ],
})
export class ToursModule {}
