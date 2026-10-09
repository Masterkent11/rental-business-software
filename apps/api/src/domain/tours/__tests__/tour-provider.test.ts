import { describe, expect, it } from 'vitest';
import {
  InvalidSceneViewError,
  SceneRemovalBlockedError,
  TourNotPublishableError,
  assertInitialView,
  assertPublishable,
  assertSceneRemovable,
  type Scene,
} from '@/domain/tours/tour.ts';

const scene = (id: string, targetSceneId: string | null = null): Scene => ({
  id,
  label: id,
  position: 0,
  state: 'READY',
  failureReason: null,
  previewPath: `${id}/preview.webp`,
  thumbnailPath: `${id}/thumb.webp`,
  tilePrefix: `${id}/tiles`,
  tileLevels: 2,
  hotspots: targetSceneId
    ? [{ id: `h-${id}`, kind: 'NAVIGATION', yaw: 0, pitch: 0, label: 'Door', targetSceneId }]
    : [],
});

describe('platform tours', () => {
  it('requires at least one room and a designated entry scene to publish', () => {
    expect(() => assertPublishable({ entrySceneId: 'a', scenes: [scene('a')] })).not.toThrow();
    expect(() => assertPublishable({ entrySceneId: null, scenes: [scene('a')] })).toThrow(
      TourNotPublishableError,
    );
    expect(() => assertPublishable({ entrySceneId: 'a', scenes: [] })).toThrow(
      TourNotPublishableError,
    );
  });

  it('validates the starting view', () => {
    expect(() => assertInitialView({ yaw: 0, pitch: 0, fov: 75 })).not.toThrow();
    expect(() => assertInitialView({ yaw: 0, pitch: 89, fov: 75 })).toThrow(InvalidSceneViewError);
    expect(() => assertInitialView({ yaw: 0, pitch: 0, fov: 150 })).toThrow(InvalidSceneViewError);
  });

  it('allows removing a room from a draft tour', () => {
    expect(() =>
      assertSceneRemovable({ state: 'READY', entrySceneId: 'a', scenes: [scene('a', 'b'), scene('b')] }, 'b'),
    ).not.toThrow();
  });

  it('refuses to remove the only opening room of a published tour', () => {
    expect(() =>
      assertSceneRemovable({ state: 'PUBLISHED', entrySceneId: 'a', scenes: [scene('a', 'b'), scene('b', 'a')] }, 'a'),
    ).toThrow(SceneRemovalBlockedError);
  });

  it('removing a room from a published tour drops the doors that led to it', () => {
    expect(() =>
      assertSceneRemovable({ state: 'PUBLISHED', entrySceneId: 'a', scenes: [scene('a', 'b'), scene('b')] }, 'b'),
    ).not.toThrow();
  });
});
