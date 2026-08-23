import { afterAll, describe, expect, it } from 'vitest';
import { postgresTourRepository } from '../tour-repository.pg.ts';
import { sql, withScope } from '../db.ts';
import { assertPublishable, isWalkable } from '../../../domain/tours/tour.ts';

const live = Boolean(process.env.DATABASE_URL);
const suite = live ? describe : describe.skip;

/** Santos's unit, which the tour seed gives three rooms. */
const UNIT = 'b1111111-0000-0000-0000-000000000001';
/** Villa's bunk — has a tour row, but no scenes. */
const BED = 'b3333333-0000-0000-0000-000000000002';
const SANTOS_ORG = '11111111-1111-1111-1111-111111111111';

suite('tours against real PostgreSQL', { timeout: 30_000 }, () => {
  const tours = postgresTourRepository();

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  it('returns the published tour with its rooms in order', async () => {
    const tour = await tours.publishedForResource(UNIT);

    expect(tour).not.toBeNull();
    expect(tour!.scenes.map((s) => s.label)).toEqual([
      'Living room',
      'Kitchen',
      'Bedroom',
    ]);
    expect(tour!.entrySceneId).toBe(tour!.scenes[0]!.id);
  });

  it('carries the paths the viewer needs to paint', async () => {
    const tour = await tours.publishedForResource(UNIT);
    const first = tour!.scenes[0]!;

    // Preview first, tiles after — the whole reason for the pipeline.
    expect(first.previewPath).toContain('preview');
    expect(first.tilePrefix).toContain('tiles');
    expect(first.tileLevels).toBeGreaterThan(0);
    expect(isWalkable(first)).toBe(true);
  });

  it('carries the doors, pointing at rooms in the same tour', async () => {
    const tour = await tours.publishedForResource(UNIT);
    const ids = new Set(tour!.scenes.map((s) => s.id));

    const doors = tour!.scenes.flatMap((s) =>
      s.hotspots.filter((h) => h.kind === 'NAVIGATION'),
    );

    expect(doors.length).toBeGreaterThanOrEqual(4);
    for (const door of doors) {
      expect(ids.has(door.targetSceneId!)).toBe(true);
    }
  });

  it('keeps INFO hotspots, which lead nowhere by design', async () => {
    const tour = await tours.publishedForResource(UNIT);
    const notes = tour!.scenes.flatMap((s) =>
      s.hotspots.filter((h) => h.kind === 'INFO'),
    );

    expect(notes).toHaveLength(1);
    expect(notes[0]!.targetSceneId).toBeNull();
  });

  it('satisfies I-07, checked against the real rows', async () => {
    // The invariant is enforced in the aggregate; this is the seeded tour
    // actually passing it rather than a hand-built object doing so.
    const tour = await tours.publishedForResource(UNIT);
    expect(() => assertPublishable(tour!)).not.toThrow();
  });

  it('has no tour for a resource with no scenes', async () => {
    const tour = await tours.publishedForResource(BED);
    // The row exists; a tour with nothing in it is not a tour.
    expect(tour === null || tour.scenes.length === 0).toBe(true);
  });

  it('hides a scene that is still processing from the customer', async () => {
    const scene = (await tours.publishedForResource(UNIT))!.scenes[2]!;

    await withScope(SANTOS_ORG, (tx) => tx`
      update tour_scenes set state = 'PROCESSING' where id = ${scene.id}
    `);

    try {
      const tour = await tours.publishedForResource(UNIT);
      // An unprocessed panorama is not something to show anybody.
      expect(tour!.scenes.map((s) => s.id)).not.toContain(scene.id);
    } finally {
      await withScope(SANTOS_ORG, (tx) => tx`
        update tour_scenes set state = 'READY' where id = ${scene.id}
      `);
    }
  });

  it('refuses to consider itself publishable with a dead door', async () => {
    const tour = (await tours.publishedForResource(UNIT))!;
    const kitchen = tour.scenes.find((s) => s.label === 'Kitchen')!;

    await withScope(SANTOS_ORG, (tx) => tx`
      update tour_scenes set state = 'PROCESSING' where id = ${kitchen.id}
    `);

    try {
      // The owner view keeps unprocessed rooms, so the aggregate can see the
      // door pointing at one and refuse.
      const owned = await tours.forOrganization(SANTOS_ORG, tour.id);
      expect(() => assertPublishable(owned!)).toThrow(/not ready/);
    } finally {
      await withScope(SANTOS_ORG, (tx) => tx`
        update tour_scenes set state = 'READY' where id = ${kitchen.id}
      `);
    }
  });

  describe('the owner view', () => {
    it('shows rooms the customer cannot see', async () => {
      const published = (await tours.publishedForResource(UNIT))!;
      const owned = await tours.forOrganization(SANTOS_ORG, published.id);

      expect(owned!.scenes.length).toBeGreaterThanOrEqual(3);
    });

    it('shows nothing of another organization\'s tour', async () => {
      const published = (await tours.publishedForResource(UNIT))!;
      const other = await tours.forOrganization(
        '33333333-3333-3333-3333-333333333333',
        published.id,
      );

      expect(other).toBeNull();
    });
  });
});
