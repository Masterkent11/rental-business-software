import type { Scene, Tour } from '../../domain/tours/tour.ts';

export class TourNotFoundError extends Error {}
export class SceneNotFoundError extends Error {}

/** The derivatives a processed panorama produced, ready to record. */
export interface ProcessedScenePaths {
  readonly sourcePath: string;
  readonly previewPath: string;
  readonly thumbnailPath: string;
  readonly tilePrefix: string;
  readonly tileLevels: number;
  readonly widthPx: number;
  readonly heightPx: number;
}

export interface TourRepository {
  /**
   * The published tour for a resource, or null.
   *
   * Returns only READY scenes: an unprocessed panorama is not something to show
   * anybody, and a half-built tour on a published listing is the dead end I-07
   * exists to prevent.
   */
  publishedForResource(resourceId: string): Promise<Tour | null>;

  /**
   * The tile prefix for a scene a customer is allowed to see, or null.
   *
   * Deliberately narrow: the tile route needs one string, and asking for the
   * whole tour to serve one 12 KB image would be a query per tile.
   */
  publicTilePrefix(sceneId: string): Promise<string | null>;

  /** Everything the owner has, processing and failures included. */
  forOrganization(organizationId: string, tourId: string): Promise<Tour | null>;

  /** The tour for a resource, creating one if the owner has none yet. */
  ensureForResource(organizationId: string, resourceId: string): Promise<Tour>;

  /**
   * Record a room before its panorama has been processed.
   *
   * Created UPLOADING rather than READY, because processing state is
   * domain-visible (ADR-0009) and a room with no pixels must never look
   * walkable.
   */
  addScene(input: {
    organizationId: string;
    tourId: string;
    label: string;
  }): Promise<Scene>;

  /** Attach the derivatives and mark the room walkable. */
  markSceneReady(input: {
    organizationId: string;
    sceneId: string;
    paths: ProcessedScenePaths;
  }): Promise<Scene>;

  /** Record why a panorama could not be used, in words an owner can act on. */
  markSceneFailed(input: {
    organizationId: string;
    sceneId: string;
    reason: string;
  }): Promise<Scene>;

  renameScene(input: {
    organizationId: string;
    sceneId: string;
    label: string;
  }): Promise<Scene>;

  /** The order the owner authored, applied in one transaction. */
  reorderScenes(input: {
    organizationId: string;
    tourId: string;
    sceneIdsInOrder: readonly string[];
  }): Promise<void>;

  setEntryScene(input: {
    organizationId: string;
    tourId: string;
    sceneId: string;
  }): Promise<void>;

  addHotspot(input: {
    organizationId: string;
    sceneId: string;
    kind: 'NAVIGATION' | 'INFO';
    yaw: number;
    pitch: number;
    label: string;
    targetSceneId: string | null;
  }): Promise<string>;

  removeHotspot(input: {
    organizationId: string;
    hotspotId: string;
  }): Promise<void>;

  /** Publish, or refuse. I-07 is checked by the caller against the aggregate. */
  setPublished(input: {
    organizationId: string;
    tourId: string;
    published: boolean;
  }): Promise<void>;

  /** Keep the tour's own state honest about its scenes. */
  refreshTourState(input: {
    organizationId: string;
    tourId: string;
  }): Promise<void>;
}
