import type { Scene, TourProvider, TourState } from './tour-state.ts';
import {
  InvalidSceneViewError,
  InvalidTourProviderError,
  SceneRemovalBlockedError,
  TourNotPublishableError,
} from './tour-errors.ts';

export const MATTERPORT_MODEL_ID = /^[A-Za-z0-9]{8,24}$/;
export const DEFAULT_INITIAL_FOV = 75;

export function parseMatterportModelId(raw: string): string {
  const value = raw.trim();
  if (MATTERPORT_MODEL_ID.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InvalidTourProviderError('Paste the Matterport share link or model ID');
  }
  if (url.protocol !== 'https:' || url.hostname !== 'my.matterport.com' || url.pathname !== '/show/') {
    throw new InvalidTourProviderError('Only my.matterport.com share links are supported');
  }
  const model = url.searchParams.get('m') ?? '';
  if (!MATTERPORT_MODEL_ID.test(model)) {
    throw new InvalidTourProviderError('That Matterport link does not contain a valid model ID');
  }
  return model;
}

export function matterportEmbedUrl(modelId: string): string {
  if (!MATTERPORT_MODEL_ID.test(modelId)) {
    throw new InvalidTourProviderError('Invalid Matterport model ID');
  }
  return `https://my.matterport.com/show/?m=${modelId}&play=1&qs=1&brand=0&help=0`;
}

export function assertInitialView(view: { yaw: number; pitch: number; fov: number }): void {
  if (!Number.isFinite(view.yaw) || view.yaw < -180 || view.yaw > 180) {
    throw new InvalidSceneViewError('The starting direction must be between -180° and 180°');
  }
  if (!Number.isFinite(view.pitch) || view.pitch < -85 || view.pitch > 85) {
    throw new InvalidSceneViewError('The starting tilt must be between -85° and 85°');
  }
  if (!Number.isFinite(view.fov) || view.fov < 30 || view.fov > 110) {
    throw new InvalidSceneViewError('The starting zoom must be between 30° and 110°');
  }
}

export function inboundHotspotIds(scenes: readonly Scene[], sceneId: string): string[] {
  return scenes.flatMap((scene) =>
    scene.hotspots.filter((hotspot) => hotspot.targetSceneId === sceneId).map((hotspot) => hotspot.id),
  );
}

export function assertSceneRemovable(
  tour: { state: TourState; entrySceneId: string | null; scenes: readonly Scene[]; provider?: TourProvider },
  sceneId: string,
): void {
  if (tour.state !== 'PUBLISHED') return;
  const remaining = tour.scenes
    .filter((scene) => scene.id !== sceneId)
    .map((scene) => ({
      ...scene,
      hotspots: scene.hotspots.filter((hotspot) => hotspot.targetSceneId !== sceneId),
    }));
  try {
    assertPublishable({
      entrySceneId: tour.entrySceneId === sceneId ? null : tour.entrySceneId,
      scenes: remaining,
    });
  } catch (error) {
    if (error instanceof TourNotPublishableError) {
      throw new SceneRemovalBlockedError(
        'Removing this room would break the published tour. Unpublish it or choose another opening room first.',
      );
    }
    throw error;
  }
}

/** A scene the viewer can actually open. */
export function isWalkable(scene: Scene): boolean {
  return (
    scene.state === 'READY' &&
    scene.previewPath !== null &&
    scene.tilePrefix !== null &&
    scene.tileLevels > 0
  );
}

/**
 * I-07 — tour navigation is total.
 */
export function assertPublishable(tour: {
  entrySceneId: string | null;
  scenes: readonly Scene[];
  provider?: TourProvider;
  externalModelId?: string | null;
}): void {
  if (tour.provider === 'MATTERPORT') {
    if (!tour.externalModelId || !MATTERPORT_MODEL_ID.test(tour.externalModelId)) {
      throw new TourNotPublishableError('Add the Matterport model before publishing.');
    }
    return;
  }

  const problems: string[] = [];

  const walkable = new Set(
    tour.scenes.filter(isWalkable).map((scene) => scene.id),
  );
  const present = new Set(tour.scenes.map((scene) => scene.id));

  if (tour.scenes.length === 0) {
    problems.push('A tour needs at least one room.');
  }

  if (tour.entrySceneId === null) {
    problems.push('Choose which room the tour opens in.');
  } else if (!walkable.has(tour.entrySceneId)) {
    problems.push('The opening room is not ready yet.');
  }

  const failed = tour.scenes.filter((scene) => scene.state === 'FAILED');
  for (const scene of failed) {
    problems.push(
      `“${scene.label}” failed to process: ${scene.failureReason ?? 'unknown reason'}`,
    );
  }

  const unfinished = tour.scenes.filter(
    (scene) => scene.state === 'UPLOADING' || scene.state === 'PROCESSING',
  );
  if (unfinished.length > 0) {
    problems.push(
      `Still processing: ${unfinished.map((s) => `“${s.label}”`).join(', ')}.`,
    );
  }

  for (const scene of tour.scenes) {
    for (const hotspot of scene.hotspots) {
      if (hotspot.kind !== 'NAVIGATION') continue;

      if (hotspot.targetSceneId === null) {
        problems.push(`A door in “${scene.label}” leads nowhere.`);
        continue;
      }
      if (!present.has(hotspot.targetSceneId)) {
        problems.push(
          `A door in “${scene.label}” leads to a room that is no longer in this tour.`,
        );
        continue;
      }
      if (!walkable.has(hotspot.targetSceneId)) {
        problems.push(
          `A door in “${scene.label}” leads to a room that is not ready.`,
        );
      }
    }
  }

  if (problems.length > 0) {
    throw new TourNotPublishableError(problems.join(' '));
  }
}

/**
 * What the tour's own state should be, given its scenes.
 */
export function deriveTourState(
  scenes: readonly Scene[],
  published: boolean,
): TourState {
  if (published) return 'PUBLISHED';
  if (scenes.length === 0) return 'DRAFT';
  if (scenes.some((s) => s.state === 'FAILED')) return 'FAILED';
  if (scenes.some((s) => s.state === 'UPLOADING' || s.state === 'PROCESSING')) {
    return 'PROCESSING';
  }
  return scenes.every(isWalkable) ? 'READY' : 'DRAFT';
}

/** Yaw wraps around the sphere; pitch does not. */
export function normaliseYaw(degrees: number): number {
  const wrapped = ((degrees + 180) % 360 + 360) % 360 - 180;
  return wrapped === -180 ? 180 : wrapped;
}

export function clampPitch(degrees: number): number {
  return Math.min(90, Math.max(-90, degrees));
}
