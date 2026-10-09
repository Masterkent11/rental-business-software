import type { Scene, Tour, TourProvider, TourState } from '@/domain/tours/tour.ts';

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

export interface TourOverview {
  readonly tourId: string | null;
  readonly resourceId: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly listingIntent: 'RENT' | 'SALE';
  readonly listingState: string;
  readonly listingPhoto: string | null;
  readonly provider: TourProvider;
  readonly state: TourState | 'NONE';
  readonly sceneCount: number;
  readonly thumbnailPath: string | null;
}

export interface TourRepository {
  publishedForResource(resourceId: string): Promise<Tour | null>;
  publicTilePrefix(sceneId: string): Promise<string | null>;
  forOrganization(organizationId: string, tourId: string): Promise<Tour | null>;
  ensureForResource(organizationId: string, resourceId: string): Promise<Tour>;
  addScene(input: {
    organizationId: string;
    tourId: string;
    label: string;
  }): Promise<Scene>;
  markSceneReady(input: {
    organizationId: string;
    sceneId: string;
    paths: ProcessedScenePaths;
  }): Promise<Scene>;
  markSceneFailed(input: {
    organizationId: string;
    sceneId: string;
    reason: string;
  }): Promise<Scene>;
  renameScene(input: {
    organizationId: string;
    tourId: string;
    sceneId: string;
    label: string;
  }): Promise<Scene>;
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
    tourId: string;
    sceneId: string;
    kind: 'NAVIGATION' | 'INFO';
    yaw: number;
    pitch: number;
    label: string;
    targetSceneId: string | null;
  }): Promise<string>;
  removeHotspot(input: {
    organizationId: string;
    tourId: string;
    hotspotId: string;
  }): Promise<void>;
  updateHotspot(input: {
    organizationId: string;
    tourId: string;
    hotspotId: string;
    yaw: number;
    pitch: number;
    label: string;
    targetSceneId: string | null;
  }): Promise<void>;
  setSceneView(input: {
    organizationId: string;
    tourId: string;
    sceneId: string;
    yaw: number;
    pitch: number;
    fov: number;
  }): Promise<void>;
  removeScene(input: {
    organizationId: string;
    tourId: string;
    sceneId: string;
  }): Promise<{ readonly storagePrefix: string | null }>;
  setProvider(input: {
    organizationId: string;
    tourId: string;
    provider: TourProvider;
    externalModelId: string | null;
  }): Promise<void>;
  overviewForOrganization(organizationId: string): Promise<readonly TourOverview[]>;
  resourceForListing(organizationId: string, listingId: string): Promise<string | null>;
  setPublished(input: {
    organizationId: string;
    tourId: string;
    published: boolean;
  }): Promise<void>;
  refreshTourState(input: {
    organizationId: string;
    tourId: string;
  }): Promise<void>;
}
