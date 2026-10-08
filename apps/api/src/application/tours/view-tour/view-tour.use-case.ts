import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { MediaStorage } from '@/application/ports/storage/media-storage.port.ts';
import { isWalkable, matterportEmbedUrl, type Scene, type TourProvider } from '@/domain/tours/tour.ts';

export interface ViewSceneResult {
  readonly id: string;
  readonly label: string;
  readonly position: number;
  readonly previewUrl: string | null;
  readonly thumbnailUrl: string | null;
  readonly tileUrlTemplate: string | null;
  readonly tileLevels: number;
  readonly initialYaw: number;
  readonly initialPitch: number;
  readonly initialFov: number;
  readonly hotspots: readonly {
    readonly id: string;
    readonly kind: string;
    readonly yaw: number;
    readonly pitch: number;
    readonly label: string;
    readonly targetSceneId: string | null;
  }[];
}

export interface ViewTourResult {
  readonly id: string;
  readonly resourceId: string;
  readonly provider: TourProvider;
  readonly embedUrl: string | null;
  readonly entrySceneId: string | null;
  readonly scenes: readonly ViewSceneResult[];
}

export const getResourceTour =
  (tours: TourRepository, storage: MediaStorage) =>
  async (resourceId: string): Promise<ViewTourResult | null> => {
    const tour = await tours.publishedForResource(resourceId);
    if (!tour) return null;

    if (tour.provider === 'MATTERPORT') {
      if (!tour.externalModelId) return null;
      return {
        id: tour.id,
        resourceId: tour.resourceId,
        provider: 'MATTERPORT',
        embedUrl: matterportEmbedUrl(tour.externalModelId),
        entrySceneId: null,
        scenes: [],
      };
    }

    const walkable = tour.scenes.filter(isWalkable);
    if (walkable.length === 0) return null;

    const mappedScenes = await Promise.all(
      walkable.map(async (scene: Scene): Promise<ViewSceneResult> => ({
        id: scene.id,
        label: scene.label,
        position: scene.position,
        previewUrl: scene.previewPath ? await storage.createReadUrl(scene.previewPath).catch(() => null) : null,
        thumbnailUrl: scene.thumbnailPath ? await storage.createReadUrl(scene.thumbnailPath).catch(() => null) : null,
        tileUrlTemplate: scene.tilePrefix ? `/tiles/${scene.id}/{level}/{x}/{y}` : null,
        tileLevels: scene.tileLevels,
        initialYaw: scene.initialYaw ?? 0,
        initialPitch: scene.initialPitch ?? 0,
        initialFov: scene.initialFov ?? 75,
        hotspots: scene.hotspots.map((hotspot) => ({
          id: hotspot.id,
          kind: hotspot.kind,
          yaw: hotspot.yaw,
          pitch: hotspot.pitch,
          label: hotspot.label,
          targetSceneId: hotspot.targetSceneId,
        })),
      })),
    );

    return {
      id: tour.id,
      resourceId: tour.resourceId,
      provider: 'PLATFORM',
      embedUrl: null,
      entrySceneId: tour.entrySceneId ?? walkable[0]!.id,
      scenes: mappedScenes,
    };
  };

export const getTourTileUrl =
  (tours: TourRepository, storage: MediaStorage) =>
  async (input: { sceneId: string; level: number; x: number; y: number }): Promise<string | null> => {
    const prefix = await tours.publicTilePrefix(input.sceneId);
    if (!prefix) return null;

    return storage.createReadUrl(`${prefix}/${input.level}/${input.x}_${input.y}.webp`);
  };
