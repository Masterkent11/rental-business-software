import {
  NotAPanoramaError,
  type PanoramaProcessor,
} from '../../application/ports/panorama-processor.ts';
import type { MediaStorage, StoredObject } from '../../application/ports/media-storage.ts';
import type { TourRepository } from '../../application/ports/tour-repository.ts';
import { assertPublishable, type Scene, type Tour } from '../../domain/tours/tour.ts';

/**
 * Owner authoring.
 *
 * Every write goes through the same repository the customer read uses, and
 * publication goes through the same [assertPublishable] the domain owns. There
 * is deliberately no second validation path here: I-07 is one rule in one
 * place, and a copy of it in the authoring flow would be the copy that drifts.
 */
export const createTourForResource =
  (tours: TourRepository) =>
  (input: { organizationId: string; resourceId: string }): Promise<Tour> =>
    tours.ensureForResource(input.organizationId, input.resourceId);

/**
 * Add a room and process its panorama.
 *
 * The scene row is created **before** processing starts, so the owner sees the
 * room appear as UPLOADING rather than watching a spinner with nothing behind
 * it. Failure is written to that same row, which is what makes processing
 * state domain-visible (ADR-0009) instead of a lost background error.
 */
export const addSceneWithPanorama =
  (
    tours: TourRepository,
    processor: PanoramaProcessor,
    storage: MediaStorage,
  ) =>
  async (input: {
    organizationId: string;
    tourId: string;
    label: string;
    panorama: Buffer;
  }): Promise<Scene> => {
    const scene = await tours.addScene({
      organizationId: input.organizationId,
      tourId: input.tourId,
      label: input.label,
    });

    const prefix = `${input.organizationId}/${input.tourId}/${scene.id}`;

    try {
      const processed = await processor.process(input.panorama);

      const objects: StoredObject[] = [
        {
          path: `${prefix}/source`,
          body: input.panorama,
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

      await storage.put(objects);

      const ready = await tours.markSceneReady({
        organizationId: input.organizationId,
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
        organizationId: input.organizationId,
        tourId: input.tourId,
      });

      return ready;
    } catch (error) {
      // The owner needs to know which room failed and why. A rejected upload
      // that vanishes leaves them re-uploading the same file.
      const reason =
        error instanceof NotAPanoramaError
          ? error.message
          : 'Processing failed. Try uploading the photo again.';

      const failed = await tours.markSceneFailed({
        organizationId: input.organizationId,
        sceneId: scene.id,
        reason,
      });

      await tours.refreshTourState({
        organizationId: input.organizationId,
        tourId: input.tourId,
      });

      return failed;
    }
  };

export const connectScenes =
  (tours: TourRepository) =>
  (input: {
    organizationId: string;
    sceneId: string;
    targetSceneId: string;
    yaw: number;
    pitch: number;
    label: string;
  }) =>
    tours.addHotspot({
      organizationId: input.organizationId,
      sceneId: input.sceneId,
      kind: 'NAVIGATION',
      yaw: input.yaw,
      pitch: input.pitch,
      label: input.label,
      targetSceneId: input.targetSceneId,
    });

export const annotateScene =
  (tours: TourRepository) =>
  (input: {
    organizationId: string;
    sceneId: string;
    yaw: number;
    pitch: number;
    label: string;
  }) =>
    tours.addHotspot({
      organizationId: input.organizationId,
      sceneId: input.sceneId,
      kind: 'INFO',
      yaw: input.yaw,
      pitch: input.pitch,
      label: input.label,
      targetSceneId: null,
    });

/**
 * Publish, or refuse and say why.
 *
 * The check is [assertPublishable] — the same function the domain tests cover
 * and the only place I-07 lives. Refusing here rather than at read time is the
 * point: a dead end discovered by a customer is one they already trusted.
 */
export const publishTour =
  (tours: TourRepository) =>
  async (input: { organizationId: string; tourId: string }): Promise<Tour> => {
    const tour = await tours.forOrganization(input.organizationId, input.tourId);
    if (!tour) throw new Error('No such tour');

    assertPublishable(tour);

    await tours.setPublished({
      organizationId: input.organizationId,
      tourId: input.tourId,
      published: true,
    });

    return (await tours.forOrganization(
      input.organizationId,
      input.tourId,
    )) as Tour;
  };

export const unpublishTour =
  (tours: TourRepository) =>
  async (input: { organizationId: string; tourId: string }) => {
    await tours.setPublished({
      organizationId: input.organizationId,
      tourId: input.tourId,
      published: false,
    });
  };

/**
 * What still stands between this tour and being published.
 *
 * The same rule as `publishTour`, asked without doing anything — so the
 * authoring screen can show the list while the owner works rather than only
 * when they press publish.
 */
export const tourReadiness =
  (tours: TourRepository) =>
  async (input: {
    organizationId: string;
    tourId: string;
  }): Promise<{ publishable: boolean; problems: string | null }> => {
    const tour = await tours.forOrganization(input.organizationId, input.tourId);
    if (!tour) throw new Error('No such tour');

    try {
      assertPublishable(tour);
      return { publishable: true, problems: null };
    } catch (error) {
      return { publishable: false, problems: (error as Error).message };
    }
  };
