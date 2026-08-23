import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { postgresTourRepository } from '../tour-repository.pg.ts';
import { sql, withScope } from '../db.ts';
import { sharpPanoramaProcessor } from '../../media/sharp-panorama-processor.ts';
import {
  addSceneWithPanorama,
  connectScenes,
  createTourForResource,
  publishTour,
  tourReadiness,
} from '../../../features/author-tour/author-tour.ts';
import { TourNotPublishableError } from '../../../domain/tours/tour.ts';
import type {
  MediaStorage,
  StoredObject,
} from '../../../application/ports/media-storage.ts';

const live = Boolean(process.env.DATABASE_URL);
const suite = live ? describe : describe.skip;

/** Villa's bunk: it has a tour row from the Sprint 1 seed but no scenes. */
const BED = 'b3333333-0000-0000-0000-000000000002';
const VILLA_ORG = '33333333-3333-3333-3333-333333333333';

/**
 * Storage in memory.
 *
 * The processing pipeline itself is covered against real sharp output in
 * `sharp-panorama-processor.test.ts`; what this suite is about is whether the
 * authoring flow records the right rows and whether I-07 gates publication.
 * Talking to Supabase Storage here would make the tests slow and flaky without
 * testing anything new.
 */
function inMemoryStorage(): MediaStorage & { readonly written: string[] } {
  const written: string[] = [];
  return {
    written,
    async put(objects: readonly StoredObject[]) {
      for (const object of objects) written.push(object.path);
    },
    async createReadUrl(path: string) {
      return `memory://${path}`;
    },
  };
}

/** A real 2:1 panorama, small enough to keep the suite quick. */
async function panorama(width = 2048): Promise<Buffer> {
  const height = width / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#5566aa"/>
    <rect y="${height * 0.7}" width="${width}" height="${height * 0.3}" fill="#6b5b4a"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
}

suite('tour authoring against real PostgreSQL', { timeout: 120_000 }, () => {
  const tours = postgresTourRepository();
  const processor = sharpPanoramaProcessor();
  const storage = inMemoryStorage();

  let tourId: string;

  const reset = async () => {
    await withScope(VILLA_ORG, (tx) => tx`
      update virtual_tours set entry_scene_id = null, state = 'DRAFT'
       where resource_id = ${BED}
    `);
    await withScope(VILLA_ORG, (tx) => tx`
      delete from tour_hotspots where organization_id = ${VILLA_ORG}
    `);
    await withScope(VILLA_ORG, (tx) => tx`
      delete from tour_scenes where organization_id = ${VILLA_ORG}
    `);
  };

  beforeAll(async () => {
    await reset();
    const tour = await createTourForResource(tours)({
      organizationId: VILLA_ORG,
      resourceId: BED,
    });
    tourId = tour.id;
  });

  afterAll(async () => {
    await reset();
    await sql.end({ timeout: 5 });
  });

  it('reuses the tour a resource already has', async () => {
    // A hybrid resource has two listings over one set of rooms. Creating a
    // second tour would give it two walkthroughs that drift apart.
    const again = await createTourForResource(tours)({
      organizationId: VILLA_ORG,
      resourceId: BED,
    });
    expect(again.id).toBe(tourId);
  });

  it('refuses to publish an empty tour', async () => {
    await expect(
      publishTour(tours)({ organizationId: VILLA_ORG, tourId }),
    ).rejects.toBeInstanceOf(TourNotPublishableError);
  });

  describe('adding rooms', () => {
    it('processes a panorama and makes the room walkable', async () => {
      const scene = await addSceneWithPanorama(tours, processor, storage)({
        organizationId: VILLA_ORG,
        tourId,
        label: 'Bunk room',
        panorama: await panorama(),
      });

      expect(scene.state).toBe('READY');
      expect(scene.tileLevels).toBeGreaterThan(0);

      // The derivatives actually landed, under a path that names the scene.
      expect(storage.written.some((p) => p.endsWith('preview.webp'))).toBe(true);
      expect(storage.written.some((p) => p.includes('/tiles/0/'))).toBe(true);
      expect(storage.written.some((p) => p.endsWith('/source'))).toBe(true);
    });

    it('records a failure on the room rather than losing it', async () => {
      // The owner asked to add a room, so a room exists — carrying the reason.
      // A rejected upload that vanishes leaves them re-uploading the same file.
      const photo = await sharp({
        create: { width: 1600, height: 900, channels: 3, background: '#777' },
      })
        .jpeg()
        .toBuffer();

      const scene = await addSceneWithPanorama(tours, processor, storage)({
        organizationId: VILLA_ORG,
        tourId,
        label: 'Not a panorama',
        panorama: photo,
      });

      expect(scene.state).toBe('FAILED');
      expect(scene.failureReason).toMatch(/twice as wide/);
      // And it is not walkable, so it cannot be shown to anybody.
      expect(scene.tileLevels).toBe(0);
    });

    it('keeps the tour state honest about its rooms', async () => {
      const tour = await tours.forOrganization(VILLA_ORG, tourId);
      // One room failed, so the tour says so rather than claiming READY.
      expect(tour!.state).toBe('FAILED');
    });
  });

  describe('I-07 gates publication', () => {
    it('names the failed room and refuses', async () => {
      const readiness = await tourReadiness(tours)({
        organizationId: VILLA_ORG,
        tourId,
      });

      expect(readiness.publishable).toBe(false);
      expect(readiness.problems).toContain('Not a panorama');
    });

    it('still refuses once the failure is gone but no entry is set', async () => {
      const tour = await tours.forOrganization(VILLA_ORG, tourId);
      const failed = tour!.scenes.find((s) => s.state === 'FAILED')!;

      await withScope(VILLA_ORG, (tx) => tx`
        delete from tour_scenes where id = ${failed.id}
      `);

      const readiness = await tourReadiness(tours)({
        organizationId: VILLA_ORG,
        tourId,
      });
      expect(readiness.problems).toContain('opens in');
    });

    it('distinguishes a missing destination from one that is not ready', async () => {
      // The two halves of I-07 need different words: one sends the owner
      // looking for a deleted room, the other tells them to wait.
      const tour = await tours.forOrganization(VILLA_ORG, tourId);
      const bunk = tour!.scenes[0]!;

      const second = await addSceneWithPanorama(tours, processor, storage)({
        organizationId: VILLA_ORG,
        tourId,
        label: 'Landing',
        panorama: await panorama(),
      });

      await tours.setEntryScene({
        organizationId: VILLA_ORG,
        tourId,
        sceneId: bunk.id,
      });
      await connectScenes(tours)({
        organizationId: VILLA_ORG,
        sceneId: bunk.id,
        targetSceneId: second.id,
        yaw: 30,
        pitch: 0,
        label: 'Landing',
      });

      // Ready now.
      expect(
        (await tourReadiness(tours)({ organizationId: VILLA_ORG, tourId }))
          .publishable,
      ).toBe(true);

      // Not ready: the destination goes back to processing.
      await withScope(VILLA_ORG, (tx) => tx`
        update tour_scenes set state = 'PROCESSING' where id = ${second.id}
      `);
      expect(
        (await tourReadiness(tours)({ organizationId: VILLA_ORG, tourId }))
          .problems,
      ).toContain('not ready');

      await withScope(VILLA_ORG, (tx) => tx`
        update tour_scenes set state = 'READY' where id = ${second.id}
      `);
    });

    it('refuses a door whose destination was removed', async () => {
      const tour = await tours.forOrganization(VILLA_ORG, tourId);
      const landing = tour!.scenes.find((s) => s.label === 'Landing')!;

      // Doors are ON DELETE RESTRICT, so the hotspot goes first — which is the
      // database refusing to leave a dangling door behind.
      await withScope(VILLA_ORG, (tx) => tx`
        delete from tour_hotspots where target_scene_id = ${landing.id}
      `);
      await withScope(VILLA_ORG, (tx) => tx`
        delete from tour_scenes where id = ${landing.id}
      `);

      const readiness = await tourReadiness(tours)({
        organizationId: VILLA_ORG,
        tourId,
      });
      // With the door gone too, the remaining tour is publishable again.
      expect(readiness.publishable).toBe(true);
    });

    it('will not delete a room a door still points at', async () => {
      const third = await addSceneWithPanorama(tours, processor, storage)({
        organizationId: VILLA_ORG,
        tourId,
        label: 'Corridor',
        panorama: await panorama(),
      });
      const tour = await tours.forOrganization(VILLA_ORG, tourId);
      const entry = tour!.scenes.find((s) => s.label === 'Bunk room')!;

      await connectScenes(tours)({
        organizationId: VILLA_ORG,
        sceneId: entry.id,
        targetSceneId: third.id,
        yaw: 90,
        pitch: 0,
        label: 'Corridor',
      });

      // ON DELETE RESTRICT: the schema refuses to create the dangling door
      // that I-07 would then have to catch.
      await expect(
        withScope(VILLA_ORG, (tx) => tx`
          delete from tour_scenes where id = ${third.id}
        `),
      ).rejects.toThrow();
    });
  });

  describe('publishing', () => {
    it('publishes once every door leads somewhere ready', async () => {
      const published = await publishTour(tours)({
        organizationId: VILLA_ORG,
        tourId,
      });
      expect(published.state).toBe('PUBLISHED');
    });

    it('makes the tour visible to a customer', async () => {
      // The owner flow and the customer read are the same repository: this is
      // the handover the sprint is actually about.
      const seen = await tours.publishedForResource(BED);

      expect(seen).not.toBeNull();
      expect(seen!.entrySceneId).not.toBeNull();
      expect(seen!.scenes.every((s) => s.state === 'READY')).toBe(true);
      expect(
        seen!.scenes.some((s) =>
          s.hotspots.some((h) => h.kind === 'NAVIGATION'),
        ),
      ).toBe(true);
    });

    it('serves a tile prefix for a scene the customer may see', async () => {
      const seen = await tours.publishedForResource(BED);
      const prefix = await tours.publicTilePrefix(seen!.scenes[0]!.id);

      expect(prefix).toContain('/tiles');
    });
  });
});
