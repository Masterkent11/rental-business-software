import type { Scene, TourState } from './tour-state.ts';
import { TourNotPublishableError } from './tour-errors.ts';

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
export function assertPublishable(tour: { entrySceneId: string | null; scenes: readonly Scene[] }): void {
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
