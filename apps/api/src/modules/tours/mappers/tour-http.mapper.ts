import type { Scene, Tour } from '@/domain/tours/tour.ts';

export function toSceneHttpResponse(scene: Scene) {
  return {
    id: scene.id,
    label: scene.label,
    position: scene.position,
    state: scene.state,
    failureReason: scene.failureReason,
    tileLevels: scene.tileLevels,
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

export function toTourHttpResponse(tour: Tour) {
  return {
    id: tour.id,
    resourceId: tour.resourceId,
    state: tour.state,
    entrySceneId: tour.entrySceneId,
    scenes: tour.scenes.map(toSceneHttpResponse),
  };
}
