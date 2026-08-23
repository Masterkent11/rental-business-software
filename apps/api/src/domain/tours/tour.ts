/**
 * A virtual tour: panoramas joined by doors.
 *
 * On the critical path (D-07) and the product's differentiator. The rule that
 * matters most is [I-07]: a published tour may not contain a door that leads
 * nowhere. A dead end is worse than no tour at all, because by then the
 * customer has already trusted it.
 */
export type SceneState = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export type HotspotKind = 'NAVIGATION' | 'INFO';

export type TourState =
  | 'DRAFT'
  | 'PROCESSING'
  | 'READY'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'FAILED';

export interface Hotspot {
  readonly id: string;
  readonly kind: HotspotKind;
  /** Degrees on the sphere. Yaw wraps at ±180; pitch is clamped at ±90. */
  readonly yaw: number;
  readonly pitch: number;
  readonly label: string;
  /** Set for NAVIGATION, null for INFO. */
  readonly targetSceneId: string | null;
}

export interface Scene {
  readonly id: string;
  readonly label: string;
  readonly position: number;
  readonly state: SceneState;
  readonly failureReason: string | null;
  /** Kilobyte-sized, shown immediately while tiles stream in. */
  readonly previewPath: string | null;
  readonly thumbnailPath: string | null;
  readonly tilePrefix: string | null;
  readonly tileLevels: number;
  readonly hotspots: readonly Hotspot[];
}

export interface Tour {
  readonly id: string;
  readonly organizationId: string;
  readonly resourceId: string;
  readonly state: TourState;
  readonly entrySceneId: string | null;
  readonly scenes: readonly Scene[];
}

export class TourNotPublishableError extends Error {}

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
 *
 * > A PUBLISHED tour has an entry Scene, and every NAVIGATION hotspot targets a
 * > Scene that exists in the same tour and is READY.
 *
 * Checked before publishing rather than while walking, because the alternative
 * is discovering it as a customer: a door that opens onto nothing, on a listing
 * they were about to enquire about.
 *
 * Every failure is reported, not just the first — an owner fixing a tour should
 * see the whole list, not play whack-a-mole through five save attempts.
 */
export function assertPublishable(tour: Tour): void {
  const problems: string[] = [];

  const walkable = new Set(
    tour.scenes.filter(isWalkable).map((scene) => scene.id),
  );
  // I-07 has two conditions — the target must exist in this tour *and* be
  // READY — and they need different words. "Leads nowhere" sends the owner
  // looking for a deleted room; "not ready" tells them to wait.
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
 *
 * Derived rather than set by hand: a tour that says READY while a scene is
 * still processing is the disagreement the owner would discover by publishing.
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
  // -180 and 180 are the same bearing; pick one so equality works.
  return wrapped === -180 ? 180 : wrapped;
}

export function clampPitch(degrees: number): number {
  return Math.min(90, Math.max(-90, degrees));
}
