import {
  NotAPanoramaError,
  type PanoramaProcessor,
} from '@/application/ports/providers/panorama-processor.port.ts';
import type { MediaStorage, StoredObject } from '@/application/ports/storage/media-storage.port.ts';
import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { Scene } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerTourGate, type TourGate } from '@/application/identity/partner-access.rules.ts';

export interface AddOwnerSceneInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly tourId: string;
  readonly label: string;
  readonly panorama: Buffer;
  readonly accessToken?: string | null;
}

export const addOwnerSceneWithPanorama =
  (
    tours: TourRepository,
    processor: PanoramaProcessor,
    storage: MediaStorage,
    gate: TourGate = ownerTourGate,
  ) =>
  async (input: AddOwnerSceneInput): Promise<Scene> => {
    const { organizationId } = await gate({
      principal: input.principal,
      organizationId: input.organizationId,
      tourId: input.tourId,
    });
    const credentials = input.accessToken ? { accessToken: input.accessToken } : undefined;
    const label = input.label.replace(/\s+/g, ' ').trim().slice(0, 60) || 'Room';

    const scene = await tours.addScene({
      organizationId,
      tourId: input.tourId,
      label,
    });

    const prefix = `${organizationId}/${input.tourId}/${scene.id}`;

    try {
      const processed = await processor.process(input.panorama);

      const objects: StoredObject[] = [
        {
          path: `${prefix}/source`,
          body: processed.archive,
          contentType: 'image/jpeg',
        },
        {
          path: `${prefix}/preview.webp`,
          body: processed.preview,
          contentType: 'image/webp',
        },
        {
          path: `${prefix}/thumb.webp`,
          body: processed.thumbnail,
          contentType: 'image/webp',
        },
        ...processed.tiles.map((tile) => ({
          path: `${prefix}/tiles/${tile.level}/${tile.x}_${tile.y}.webp`,
          body: tile.body,
          contentType: 'image/webp',
        })),
      ];

      await storage.put(objects, credentials);

      const ready = await tours.markSceneReady({
        organizationId,
        sceneId: scene.id,
        paths: {
          sourcePath: `${prefix}/source`,
          previewPath: `${prefix}/preview.webp`,
          thumbnailPath: `${prefix}/thumb.webp`,
          tilePrefix: `${prefix}/tiles`,
          tileLevels: processed.levels,
          widthPx: processed.widthPx,
          heightPx: processed.heightPx,
        },
      });

      await tours.refreshTourState({
        organizationId,
        tourId: input.tourId,
      });

      return ready;
    } catch (error) {
      const reason =
        error instanceof NotAPanoramaError
          ? error.message
          : 'Processing failed. Try uploading the photo again.';

      const failed = await tours.markSceneFailed({
        organizationId,
        sceneId: scene.id,
        reason,
      });

      await tours.refreshTourState({
        organizationId,
        tourId: input.tourId,
      });

      return failed;
    }
  };
