import type { Scene, Tour } from '@/domain/tours/tour.ts';

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
