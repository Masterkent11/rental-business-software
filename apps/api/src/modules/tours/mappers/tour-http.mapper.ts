import type { Scene, Tour } from '@/domain/tours/tour.ts';
import { matterportEmbedUrl } from '@/domain/tours/tour.ts';
import type { SceneMediaUrls } from '@/application/tours/get-owner-tour/get-owner-tour.use-case.ts';
import type { TourOverview } from '@/application/ports/repositories/tour-repository.port.ts';

export function toSceneHttpResponse(scene: Scene, media?: SceneMediaUrls) {
  return {
    id: scene.id,
    label: scene.label,
    position: scene.position,
    state: scene.state,
    failureReason: scene.failureReason,
    tileLevels: scene.tileLevels,
    initialYaw: scene.initialYaw ?? 0,
    initialPitch: scene.initialPitch ?? 0,
    initialFov: scene.initialFov ?? 75,
    sourceUrl: media?.sourceUrl ?? null,
    previewUrl: media?.previewUrl ?? null,
    thumbnailUrl: media?.thumbnailUrl ?? null,
    hotspots: scene.hotspots.map((hotspot) => ({
      id: hotspot.id,
      kind: hotspot.kind,
      yaw: hotspot.yaw,
      pitch: hotspot.pitch,
      label: hotspot.label,
      targetSceneId: hotspot.targetSceneId,
    })),
  };
}

export function toTourHttpResponse(tour: Tour, media?: Readonly<Record<string, SceneMediaUrls>>) {
  const provider = tour.provider ?? 'PLATFORM';
  return {
    id: tour.id,
    resourceId: tour.resourceId,
    state: tour.state,
    provider,
    externalModelId: tour.externalModelId ?? null,
    embedUrl: provider === 'MATTERPORT' && tour.externalModelId ? matterportEmbedUrl(tour.externalModelId) : null,
    entrySceneId: tour.entrySceneId,
    scenes: tour.scenes.map((scene) => toSceneHttpResponse(scene, media?.[scene.id])),
  };
}

export function toTourOverviewHttpResponse(overview: TourOverview, thumbnailUrl: string | null) {
  return {
    tourId: overview.tourId,
    resourceId: overview.resourceId,
    listingId: overview.listingId,
    listingTitle: overview.listingTitle,
    listingIntent: overview.listingIntent,
    listingState: overview.listingState,
    listingPhoto: overview.listingPhoto,
    provider: overview.provider,
    state: overview.state,
    sceneCount: overview.sceneCount,
    thumbnailUrl,
  };
}
