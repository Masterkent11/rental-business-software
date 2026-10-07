import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { postgresTourRepository } from '@/infrastructure/postgres/repositories/postgres-tour.repository.ts';
import { sql, withScope } from '@/infrastructure/postgres/db.ts';
import { sharpPanoramaProcessor } from '@/infrastructure/media/sharp-panorama-processor.adapter.ts';
import { createOwnerTourForResource } from '@/application/tours/create-owner-tour/create-owner-tour.use-case.ts';
import { addOwnerSceneWithPanorama } from '@/application/tours/add-scene/add-scene.use-case.ts';
import { addOwnerHotspot } from '@/application/tours/add-hotspot/add-hotspot.use-case.ts';
import { publishOwnerTour } from '@/application/tours/publish-tour/publish-tour.use-case.ts';
import { getOwnerTourWithReadiness } from '@/application/tours/get-owner-tour/get-owner-tour.use-case.ts';
import { TourNotPublishableError } from '@/domain/tours/tour.ts';
import type {
  MediaStorage,
  StoredObject,
} from '@/application/ports/storage/media-storage.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';

const live = Boolean(process.env.DATABASE_URL);
const suite = live ? describe : describe.skip;

/** Villa's bunk: it has a tour row from the Sprint 1 seed but no scenes. */
const BED = 'b3333333-0000-0000-0000-000000000002';
const VILLA_ORG = '33333333-3333-3333-3333-333333333333';

const principal: Principal = {
  userId: 'test-user',
  displayName: 'Test User',
  capabilities: [{ capability: 'OWNER', organizationId: VILLA_ORG }],
  organizationId: VILLA_ORG,
};

/** A minimal equirectangular JPEG: 2048x1024 pixels (2:1). */
const panorama = async () =>
  sharp({
    create: {
      width: 2048,
      height: 1024,
      channels: 3,
      background: { r: 120, g: 150, b: 180 },
    },
  })
    .jpeg()
    .toBuffer();

/** Storage fake that tracks writes so the test can assert on keys. */
const memoryMediaStorage = (): MediaStorage & { written: string[] } => {
  const written: string[] = [];
  return {
    written,
    async put(objects: readonly StoredObject[]): Promise<void> {
      for (const o of objects) written.push(o.path);
    },
    async createReadUrl(path: string): Promise<string> {
      return `https://storage.test/${path}`;
    },
  };
};

suite('tour authoring against real PostgreSQL', { timeout: 60_000 }, () => {
  const tours = postgresTourRepository();
  const processor = sharpPanoramaProcessor();
  const storage = memoryMediaStorage();
  let tourId: string;

  const reset = async () => {
    await withScope(VILLA_ORG, (tx) => tx`
      delete from tour_hotspots where organization_id = ${VILLA_ORG}
    `);
    await withScope(VILLA_ORG, (tx) => tx`
      delete from tour_scenes where organization_id = ${VILLA_ORG}
    `);
    await withScope(VILLA_ORG, (tx) => tx`
      update virtual_tours set state = 'DRAFT', entry_scene_id = null
       where organization_id = ${VILLA_ORG} and resource_id = ${BED}
    `);
  };

  beforeAll(async () => {
    await reset();
    const tour = await createOwnerTourForResource(tours)({
      principal,
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
    const again = await createOwnerTourForResource(tours)({
      principal,
      organizationId: VILLA_ORG,
      resourceId: BED,
    });
    expect(again.id).toBe(tourId);
  });

  it('refuses to publish an empty tour', async () => {
    await expect(
      publishOwnerTour(tours)({ principal, organizationId: VILLA_ORG, tourId }),
    ).rejects.toBeInstanceOf(TourNotPublishableError);
  });

  describe('adding rooms', () => {
    it('processes a panorama and makes the room walkable', async () => {
      const scene = await addOwnerSceneWithPanorama(tours, processor, storage)({
        principal,
        organizationId: VILLA_ORG,
        tourId,
        label: 'Bunk room',
        panorama: await panorama(),
      });

      expect(scene.state).toBe('READY');
      expect(scene.tileLevels).toBeGreaterThan(0);

      expect(storage.written.some((p) => p.endsWith('preview.webp'))).toBe(true);
      expect(storage.written.some((p) => p.includes('/tiles/0/'))).toBe(true);
      expect(storage.written.some((p) => p.endsWith('/source'))).toBe(true);
    });

    it('records a failure on the room rather than losing it', async () => {
      const photo = await sharp({
        create: { width: 1600, height: 900, channels: 3, background: '#777' },
      })
        .jpeg()
        .toBuffer();

      const scene = await addOwnerSceneWithPanorama(tours, processor, storage)({
        principal,
        organizationId: VILLA_ORG,
        tourId,
        label: 'Not a panorama',
        panorama: photo,
      });

      expect(scene.state).toBe('FAILED');
      expect(scene.failureReason).toMatch(/twice as wide/);
      expect(scene.tileLevels).toBe(0);
    });

    it('keeps the tour state honest about its rooms', async () => {
      const tour = await tours.forOrganization(VILLA_ORG, tourId);
      expect(tour!.state).toBe('FAILED');
    });
  });

  describe('I-07 gates publication', () => {
    it('names the failed room and refuses', async () => {
      const result = await getOwnerTourWithReadiness(tours)({
        principal,
        organizationId: VILLA_ORG,
        tourId,
      });

      expect(result!.readiness.publishable).toBe(false);
      expect(result!.readiness.problems).toContain('Not a panorama');
    });

    it('still refuses once the failure is gone but no entry is set', async () => {
      const tour = await tours.forOrganization(VILLA_ORG, tourId);
      const failed = tour!.scenes.find((s) => s.state === 'FAILED')!;

      await withScope(VILLA_ORG, (tx) => tx`
        delete from tour_scenes where id = ${failed.id}
      `);

      const result = await getOwnerTourWithReadiness(tours)({
        principal,
        organizationId: VILLA_ORG,
        tourId,
      });
      expect(result!.readiness.problems).toContain('opens in');
    });

    it('distinguishes a missing destination from one that is not ready', async () => {
      const tour = await tours.forOrganization(VILLA_ORG, tourId);
      const bunk = tour!.scenes[0]!;

      const second = await addOwnerSceneWithPanorama(tours, processor, storage)({
        principal,
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
      await addOwnerHotspot(tours)({
        principal,
        organizationId: VILLA_ORG,
        sceneId: bunk.id,
        targetSceneId: second.id,
        yaw: 30,
        pitch: 0,
        label: 'Landing',
        kind: 'NAVIGATION',
      });

      const readyRes = await getOwnerTourWithReadiness(tours)({ principal, organizationId: VILLA_ORG, tourId });
      expect(readyRes!.readiness.publishable).toBe(true);

      await withScope(VILLA_ORG, (tx) => tx`
        update tour_scenes set state = 'PROCESSING' where id = ${second.id}
      `);
      const notReadyRes = await getOwnerTourWithReadiness(tours)({ principal, organizationId: VILLA_ORG, tourId });
      expect(notReadyRes!.readiness.problems).toContain('not ready');

      await withScope(VILLA_ORG, (tx) => tx`
        update tour_scenes set state = 'READY' where id = ${second.id}
      `);
    });

    it('refuses a door whose destination was removed', async () => {
      const tour = await tours.forOrganization(VILLA_ORG, tourId);
      const landing = tour!.scenes.find((s) => s.label === 'Landing')!;

      await withScope(VILLA_ORG, (tx) => tx`
        delete from tour_hotspots where target_scene_id = ${landing.id}
      `);
      await withScope(VILLA_ORG, (tx) => tx`
        delete from tour_scenes where id = ${landing.id}
      `);

      const result = await getOwnerTourWithReadiness(tours)({
        principal,
        organizationId: VILLA_ORG,
        tourId,
      });
      expect(result!.readiness.publishable).toBe(true);
    });

    it('will not delete a room a door still points at', async () => {
      const third = await addOwnerSceneWithPanorama(tours, processor, storage)({
        principal,
        organizationId: VILLA_ORG,
        tourId,
        label: 'Corridor',
        panorama: await panorama(),
      });
      const tour = await tours.forOrganization(VILLA_ORG, tourId);
      const entry = tour!.scenes.find((s) => s.label === 'Bunk room')!;

      await addOwnerHotspot(tours)({
        principal,
        organizationId: VILLA_ORG,
        sceneId: entry.id,
        targetSceneId: third.id,
        yaw: 90,
        pitch: 0,
        label: 'Corridor',
        kind: 'NAVIGATION',
      });

      await expect(
        withScope(VILLA_ORG, (tx) => tx`
          delete from tour_scenes where id = ${third.id}
        `),
      ).rejects.toThrow();
    });
  });

  describe('publishing', () => {
    it('publishes once every door leads somewhere ready', async () => {
      const published = await publishOwnerTour(tours)({
        principal,
        organizationId: VILLA_ORG,
        tourId,
      });
      expect(published.state).toBe('PUBLISHED');
    });

    it('makes the tour visible to a customer', async () => {
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
