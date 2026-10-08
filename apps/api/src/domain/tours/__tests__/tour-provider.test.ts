import { describe, expect, it } from 'vitest';
import {
  InvalidSceneViewError,
  InvalidTourProviderError,
  SceneRemovalBlockedError,
  TourNotPublishableError,
  assertInitialView,
  assertPublishable,
  assertSceneRemovable,
  matterportEmbedUrl,
  parseMatterportModelId,
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

describe('matterport tours', () => {
  it('accepts a bare model id or a my.matterport.com share link only', () => {
    expect(parseMatterportModelId('SxQL3iGyoDo')).toBe('SxQL3iGyoDo');
    expect(parseMatterportModelId('https://my.matterport.com/show/?m=SxQL3iGyoDo&play=1')).toBe('SxQL3iGyoDo');
    expect(() => parseMatterportModelId('https://evil.example/show/?m=SxQL3iGyoDo')).toThrow(InvalidTourProviderError);
    expect(() => parseMatterportModelId('http://my.matterport.com/show/?m=SxQL3iGyoDo')).toThrow(InvalidTourProviderError);
    expect(() => parseMatterportModelId('https://my.matterport.com/show/?m=<script>')).toThrow(InvalidTourProviderError);
  });

  it('builds the embed url on the server', () => {
    expect(matterportEmbedUrl('SxQL3iGyoDo')).toMatch(/^https:\/\/my\.matterport\.com\/show\/\?m=SxQL3iGyoDo&/);
  });

  it('is publishable once it has a model, without rooms', () => {
    expect(() => assertPublishable({ entrySceneId: null, scenes: [], provider: 'MATTERPORT', externalModelId: 'SxQL3iGyoDo' })).not.toThrow();
    expect(() => assertPublishable({ entrySceneId: null, scenes: [], provider: 'MATTERPORT', externalModelId: null })).toThrow(
      TourNotPublishableError,
    );
  });
});

describe('platform tours', () => {
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
