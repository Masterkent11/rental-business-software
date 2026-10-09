import { Module } from '@nestjs/common';
import { ViewTourController } from './controllers/view-tour.controller.ts';
import { AuthorTourController } from './controllers/author-tour.controller.ts';
import { AgentTourController } from './controllers/agent-tour.controller.ts';
import {
  ADD_OWNER_HOTSPOT,
  ADD_OWNER_SCENE_WITH_PANORAMA,
  CONFIGURE_TOUR_PROVIDER,
  CREATE_OWNER_TOUR_FOR_RESOURCE,
  ENSURE_LISTING_TOUR,
  GET_OWNER_TOUR_WITH_READINESS,
  GET_RESOURCE_TOUR,
  GET_TOUR_TILE_URL,
  LIST_ORGANIZATION_TOURS,
  PANORAMA_PROCESSOR,
  PUBLISH_OWNER_TOUR,
  REMOVE_OWNER_HOTSPOT,
  REMOVE_TOUR_SCENE,
  RENAME_OWNER_SCENE,
  REORDER_OWNER_SCENES,
  SET_OWNER_ENTRY_SCENE,
  SET_SCENE_VIEW,
  UNPUBLISH_OWNER_TOUR,
  UPDATE_TOUR_HOTSPOT,
} from './tour.tokens.ts';
import {
  LISTING_GATE,
  SHARED_MEDIA_STORAGE,
  SHARED_TOUR_REPOSITORY,
  TOUR_GATE,
} from '@/modules/shared/shared.tokens.ts';
import { sharpPanoramaProcessor } from '@/infrastructure/media/sharp-panorama-processor.adapter.ts';
import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { MediaStorage } from '@/application/ports/storage/media-storage.port.ts';
import type { PanoramaProcessor } from '@/application/ports/providers/panorama-processor.port.ts';
import type { ListingGate, TourGate } from '@/application/identity/partner-access.rules.ts';
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
import { updateTourHotspot } from '@/application/tours/update-hotspot/update-hotspot.use-case.ts';
import { setSceneView } from '@/application/tours/set-scene-view/set-scene-view.use-case.ts';
import { removeTourScene } from '@/application/tours/remove-scene/remove-scene.use-case.ts';
import { configureTourProvider } from '@/application/tours/configure-tour-provider/configure-tour-provider.use-case.ts';
import { listOrganizationTours } from '@/application/tours/list-organization-tours/list-organization-tours.use-case.ts';
import { ensureListingTour } from '@/application/tours/ensure-listing-tour/ensure-listing-tour.use-case.ts';

const gated = <T>(token: symbol, make: (tours: TourRepository, gate: TourGate) => T) => ({
  provide: token,
  inject: [SHARED_TOUR_REPOSITORY, TOUR_GATE],
  useFactory: (tours: TourRepository, gate: TourGate) => make(tours, gate),
});

@Module({
  controllers: [ViewTourController, AuthorTourController, AgentTourController],
  providers: [
    { provide: PANORAMA_PROCESSOR, useFactory: (): PanoramaProcessor => sharpPanoramaProcessor() },
    {
      provide: GET_RESOURCE_TOUR,
      inject: [SHARED_TOUR_REPOSITORY, SHARED_MEDIA_STORAGE],
      useFactory: (tours: TourRepository, storage: MediaStorage) => getResourceTour(tours, storage),
    },
    {
      provide: GET_TOUR_TILE_URL,
      inject: [SHARED_TOUR_REPOSITORY, SHARED_MEDIA_STORAGE],
      useFactory: (tours: TourRepository, storage: MediaStorage) => getTourTileUrl(tours, storage),
    },
    gated(CREATE_OWNER_TOUR_FOR_RESOURCE, createOwnerTourForResource),
    {
      provide: GET_OWNER_TOUR_WITH_READINESS,
      inject: [SHARED_TOUR_REPOSITORY, TOUR_GATE, SHARED_MEDIA_STORAGE],
      useFactory: (tours: TourRepository, gate: TourGate, storage: MediaStorage) =>
        getOwnerTourWithReadiness(tours, gate, storage),
    },
    {
      provide: ADD_OWNER_SCENE_WITH_PANORAMA,
      inject: [SHARED_TOUR_REPOSITORY, PANORAMA_PROCESSOR, SHARED_MEDIA_STORAGE, TOUR_GATE],
      useFactory: (tours: TourRepository, proc: PanoramaProcessor, storage: MediaStorage, gate: TourGate) =>
        addOwnerSceneWithPanorama(tours, proc, storage, gate),
    },
    gated(REORDER_OWNER_SCENES, reorderOwnerScenes),
    gated(RENAME_OWNER_SCENE, renameOwnerScene),
    gated(SET_OWNER_ENTRY_SCENE, setOwnerEntryScene),
    gated(ADD_OWNER_HOTSPOT, addOwnerHotspot),
    gated(REMOVE_OWNER_HOTSPOT, removeOwnerHotspot),
    gated(PUBLISH_OWNER_TOUR, publishOwnerTour),
    gated(UNPUBLISH_OWNER_TOUR, unpublishOwnerTour),
    gated(UPDATE_TOUR_HOTSPOT, updateTourHotspot),
    gated(SET_SCENE_VIEW, setSceneView),
    gated(CONFIGURE_TOUR_PROVIDER, configureTourProvider),
    {
      provide: REMOVE_TOUR_SCENE,
      inject: [SHARED_TOUR_REPOSITORY, SHARED_MEDIA_STORAGE, TOUR_GATE],
      useFactory: (tours: TourRepository, storage: MediaStorage, gate: TourGate) => removeTourScene(tours, storage, gate),
    },
    {
      provide: LIST_ORGANIZATION_TOURS,
      inject: [SHARED_TOUR_REPOSITORY, SHARED_MEDIA_STORAGE],
      useFactory: (tours: TourRepository, storage: MediaStorage) => listOrganizationTours(tours, storage),
    },
    {
      provide: ENSURE_LISTING_TOUR,
      inject: [SHARED_TOUR_REPOSITORY, LISTING_GATE, SHARED_MEDIA_STORAGE],
      useFactory: (tours: TourRepository, gate: ListingGate, storage: MediaStorage) => ensureListingTour(tours, gate, storage),
    },
  ],
})
export class ToursModule {}
