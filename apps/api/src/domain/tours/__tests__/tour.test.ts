import { describe, expect, it } from 'vitest';
import {
  TourNotPublishableError,
  assertPublishable,
  clampPitch,
  deriveTourState,
  isWalkable,
  normaliseYaw,
  type Hotspot,
  type Scene,
  type Tour,
} from '../tour.ts';

const scene = (over: Partial<Scene> = {}): Scene => ({
  id: 's-1',
  label: 'Living room',
  position: 0,
  state: 'READY',
  failureReason: null,
  previewPath: 'org/tour/s-1/preview.webp',
  thumbnailPath: 'org/tour/s-1/thumb.webp',
  tilePrefix: 'org/tour/s-1/tiles',
  tileLevels: 3,
  hotspots: [],
  ...over,
});

const door = (targetSceneId: string | null): Hotspot => ({
  id: 'h-1',
  kind: 'NAVIGATION',
  yaw: 30,
  pitch: 0,
  label: 'Kitchen',
  targetSceneId,
});

const tour = (over: Partial<Tour> = {}): Tour => ({
  id: 't-1',
  organizationId: 'org-1',
  resourceId: 'r-1',
  state: 'READY',
  entrySceneId: 's-1',
  scenes: [scene()],
  ...over,
});

describe('a scene the viewer can open', () => {
  it('needs a preview and tiles, not just a READY flag', () => {
    // The constraint exists because "READY" with no pixels is a black screen
    // the customer cannot distinguish from a broken app.
    expect(isWalkable(scene())).toBe(true);
    expect(isWalkable(scene({ previewPath: null }))).toBe(false);
    expect(isWalkable(scene({ tilePrefix: null }))).toBe(false);
    expect(isWalkable(scene({ tileLevels: 0 }))).toBe(false);
    expect(isWalkable(scene({ state: 'PROCESSING' }))).toBe(false);
  });
});

describe('I-07 — tour navigation is total', () => {
  it('publishes a tour whose doors all lead somewhere ready', () => {
    const kitchen = scene({ id: 's-2', label: 'Kitchen', position: 1 });
    const living = scene({ hotspots: [door('s-2')] });

    expect(() =>
      assertPublishable(tour({ scenes: [living, kitchen] })),
    ).not.toThrow();
  });

  it('refuses a door pointing at a room that is no longer in the tour', () => {
    // The failure this prevents: a customer opens a door on a published
    // listing and lands in nothing. Worse than no tour, because they already
    // trusted it.
    const living = scene({ hotspots: [door('s-missing')] });

    expect(() => assertPublishable(tour({ scenes: [living] }))).toThrow(
      /no longer in this tour/,
    );
  });

  it('refuses a door with no target at all', () => {
    const living = scene({ hotspots: [door(null)] });

    expect(() => assertPublishable(tour({ scenes: [living] }))).toThrow(
      /leads nowhere/,
    );
  });

  it('refuses a door into a room that is still processing', () => {
    const kitchen = scene({ id: 's-2', label: 'Kitchen', state: 'PROCESSING' });
    const living = scene({ hotspots: [door('s-2')] });

    expect(() =>
      assertPublishable(tour({ scenes: [living, kitchen] })),
    ).toThrow(/not ready/);
  });

  it('refuses a tour with no entry scene', () => {
    expect(() => assertPublishable(tour({ entrySceneId: null }))).toThrow(
      /opens in/,
    );
  });

  it('refuses an entry scene that is not ready', () => {
    expect(() =>
      assertPublishable(
        tour({ scenes: [scene({ state: 'PROCESSING', hotspots: [] })] }),
      ),
    ).toThrow(TourNotPublishableError);
  });

  it('refuses an empty tour', () => {
    expect(() => assertPublishable(tour({ scenes: [], entrySceneId: null })))
      .toThrow(/at least one room/);
  });

  it('names the failure reason the owner has to act on', () => {
    const broken = scene({
      state: 'FAILED',
      failureReason: 'Not a 2:1 equirectangular image',
      previewPath: null,
      tilePrefix: null,
      tileLevels: 0,
    });

    expect(() =>
      assertPublishable(tour({ scenes: [broken], entrySceneId: 's-1' })),
    ).toThrow(/2:1 equirectangular/);
  });

  it('reports every problem at once, not the first', () => {
    // An owner fixing a tour should see the whole list rather than play
    // whack-a-mole through five save attempts.
    const broken = scene({
      id: 's-9',
      label: 'Bedroom',
      state: 'FAILED',
      failureReason: 'Too small',
      previewPath: null,
      tilePrefix: null,
      tileLevels: 0,
    });
    const living = scene({ hotspots: [door('s-missing')] });

    try {
      assertPublishable(tour({ scenes: [living, broken] }));
      throw new Error('should have refused');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('Bedroom');
      expect(message).toContain('no longer in this tour');
    }
  });

  it('ignores INFO hotspots, which lead nowhere by design', () => {
    const note: Hotspot = {
      id: 'h-2',
      kind: 'INFO',
      yaw: 0,
      pitch: 0,
      label: 'Inverter aircon',
      targetSceneId: null,
    };

    expect(() =>
      assertPublishable(tour({ scenes: [scene({ hotspots: [note] })] })),
    ).not.toThrow();
  });
});

describe('the tour state follows its scenes', () => {
  it('is PROCESSING while any scene is', () => {
    expect(deriveTourState([scene(), scene({ state: 'PROCESSING' })], false))
      .toBe('PROCESSING');
  });

  it('is FAILED if any scene failed', () => {
    // Surfaced to the owner at authoring time, not to a customer mid-walk.
    expect(
      deriveTourState([scene(), scene({ state: 'FAILED' })], false),
    ).toBe('FAILED');
  });

  it('is READY when every scene is walkable', () => {
    expect(deriveTourState([scene(), scene({ id: 's-2' })], false)).toBe('READY');
  });

  it('is DRAFT when empty', () => {
    expect(deriveTourState([], false)).toBe('DRAFT');
  });

  it('stays PUBLISHED once published', () => {
    expect(deriveTourState([scene()], true)).toBe('PUBLISHED');
  });
});

describe('angles', () => {
  it('wraps yaw around the sphere', () => {
    expect(normaliseYaw(0)).toBe(0);
    expect(normaliseYaw(190)).toBe(-170);
    expect(normaliseYaw(-190)).toBe(170);
    expect(normaliseYaw(540)).toBe(180);
  });

  it('treats -180 and 180 as one bearing', () => {
    expect(normaliseYaw(-180)).toBe(180);
  });

  it('clamps pitch instead of wrapping it', () => {
    // Looking past straight up does not put you behind yourself.
    expect(clampPitch(120)).toBe(90);
    expect(clampPitch(-120)).toBe(-90);
    expect(clampPitch(45)).toBe(45);
  });
});
