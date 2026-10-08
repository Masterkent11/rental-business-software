import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import postgres from 'postgres';
import { sharpPanoramaProcessor } from '../../src/infrastructure/media/sharp-panorama-processor.adapter.ts';
import { loadEquirect, renderView } from './perspective.mjs';
import { floorPlanSvg, type Plan } from './floor-plan.mts';

const here = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(here, '../..');
const repoRoot = path.resolve(apiRoot, '../..');
const cacheDir = path.join(apiRoot, '.demo-cache', 'panoramas');
const outputSql = path.join(repoRoot, 'supabase', 'demo', 'generated-demo-media.sql');

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';
const APPLY = process.argv.includes('--apply');
const DEMO_ORG = 'd0000000-0000-4000-8000-000000000001';
const REALTY = 'd0000000-0000-4000-8000-000000000002';

const CREDENTIALS: Record<string, { email: string; password: string }> = {
  [DEMO_ORG]: {
    email: process.env.DEMO_OWNER_EMAIL ?? 'demo.owner@example.com',
    password: process.env.DEMO_OWNER_PASSWORD ?? 'DemoOwner!2026',
  },
  [REALTY]: {
    email: process.env.DEMO_AGENT_EMAIL ?? 'demo.agent@example.com',
    password: process.env.DEMO_AGENT_PASSWORD ?? 'DemoAgent!2026',
  },
};

if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY before seeding demo media.');
  process.exit(1);
}

type View = { readonly pano: string; readonly yaw: number; readonly pitch?: number; readonly fov?: number };
type Scene = {
  readonly id: string;
  readonly label: string;
  readonly pano: string;
  readonly startYaw?: number;
  readonly forwardYaw?: number;
  readonly backYaw?: number;
};
type DemoListing = {
  readonly org?: string;
  readonly listingId: string;
  readonly tourId: string | null;
  readonly scenes: readonly Scene[];
  readonly photos: readonly View[];
  readonly floorPlans?: readonly Plan[];
};

const LISTINGS: readonly DemoListing[] = [
  {
    listingId: 'd3000000-0000-4000-8000-000000000001',
    tourId: 'd4000000-0000-4000-8000-000000000001',
    scenes: [
      { id: 'd5000000-0000-4000-8000-000000000011', label: 'Living & dining', pano: 'cayley_interior' },
      { id: 'd5000000-0000-4000-8000-000000000012', label: 'Bedroom', pano: 'hotel_room' },
    ],
    photos: [
      { pano: 'cayley_interior', yaw: 275 },
      { pano: 'hotel_room', yaw: 95 },
      { pano: 'cayley_interior', yaw: 190 },
      { pano: 'hotel_room', yaw: 300 },
    ],
  },
  {
    listingId: 'd3000000-0000-4000-8000-000000000002',
    tourId: 'd4000000-0000-4000-8000-000000000002',
    scenes: [
      { id: 'd5000000-0000-4000-8000-000000000021', label: 'Living room', pano: 'reading_room' },
      { id: 'd5000000-0000-4000-8000-000000000022', label: 'Kitchen & loft', pano: 'brown_photostudio_04' },
      { id: 'd5000000-0000-4000-8000-000000000023', label: 'Bedroom', pano: 'lythwood_room' },
    ],
    photos: [
      { pano: 'reading_room', yaw: 70 },
      { pano: 'brown_photostudio_04', yaw: 180 },
      { pano: 'lythwood_room', yaw: 190 },
      { pano: 'brown_photostudio_04', yaw: 15 },
    ],
  },
  {
    listingId: 'd3000000-0000-4000-8000-000000000003',
    tourId: 'd4000000-0000-4000-8000-000000000003',
    scenes: [
      { id: 'd5000000-0000-4000-8000-000000000031', label: 'Living room', pano: 'lebombo' },
      { id: 'd5000000-0000-4000-8000-000000000032', label: 'Den', pano: 'fireplace' },
      { id: 'd5000000-0000-4000-8000-000000000033', label: 'Veranda', pano: 'veranda' },
    ],
    photos: [
      { pano: 'lebombo', yaw: 10 },
      { pano: 'veranda', yaw: 15 },
      { pano: 'fireplace', yaw: 110 },
      { pano: 'lebombo', yaw: 190 },
    ],
  },
  {
    listingId: 'd3000000-0000-4000-8000-000000000004',
    tourId: 'd4000000-0000-4000-8000-000000000004',
    scenes: [
      { id: 'd5000000-0000-4000-8000-000000000041', label: 'Your room', pano: 'small_empty_room_3' },
      { id: 'd5000000-0000-4000-8000-000000000042', label: 'Shared bathroom', pano: 'bathroom' },
    ],
    photos: [
      { pano: 'small_empty_room_3', yaw: 20 },
      { pano: 'small_empty_room_3', yaw: 200 },
      { pano: 'bathroom', yaw: 290 },
    ],
  },
  {
    listingId: 'd3000000-0000-4000-8000-000000000005',
    tourId: null,
    scenes: [],
    photos: [
      { pano: 'photo_studio_loft_hall', yaw: 20 },
      { pano: 'photo_studio_loft_hall', yaw: 290 },
    ],
  },
  {
    listingId: 'd3000000-0000-4000-8000-000000000011',
    tourId: 'd4000000-0000-4000-8000-000000000011',
    scenes: [
      { id: 'd5000000-0000-4000-8000-000000000111', label: 'Living room', pano: 'lythwood_lounge', startYaw: 60, forwardYaw: -15 },
      { id: 'd5000000-0000-4000-8000-000000000112', label: 'Kitchen & dining', pano: 'kiara_interior', startYaw: 150, forwardYaw: -60, backYaw: 0 },
      { id: 'd5000000-0000-4000-8000-000000000113', label: 'Master en-suite', pano: 'en_suite', startYaw: 0, forwardYaw: -60, backYaw: 10 },
      { id: 'd5000000-0000-4000-8000-000000000114', label: 'Bathroom', pano: 'modern_bathroom', startYaw: 240, backYaw: 125 },
    ],
    photos: [
      { pano: 'lythwood_lounge', yaw: 60 },
      { pano: 'lythwood_lounge', yaw: 270 },
      { pano: 'kiara_interior', yaw: 150 },
      { pano: 'en_suite', yaw: 10 },
      { pano: 'modern_bathroom', yaw: 240 },
    ],
    floorPlans: [
      {
        label: 'Ground floor',
        widthM: 14,
        depthM: 12,
        rooms: [
          { name: 'Garage', x: 0, y: 0, w: 6, h: 6 },
          { name: 'Living', x: 6, y: 0, w: 8, h: 6 },
          { name: 'Dining', x: 6, y: 6, w: 5, h: 6 },
          { name: 'Kitchen', x: 11, y: 6, w: 3, h: 6 },
          { name: 'Maid\'s room', x: 0, y: 6, w: 3.5, h: 3.5 },
          { name: 'Powder', x: 3.5, y: 6, w: 2.5, h: 3.5 },
          { name: 'Stairs', x: 0, y: 9.5, w: 6, h: 2.5 },
        ],
      },
      {
        label: 'Second floor',
        widthM: 14,
        depthM: 12,
        rooms: [
          { name: 'Master bedroom', x: 0, y: 0, w: 7, h: 6 },
          { name: 'En-suite', x: 7, y: 0, w: 3, h: 3 },
          { name: 'Walk-in', x: 7, y: 3, w: 3, h: 3 },
          { name: 'Bedroom 2', x: 10, y: 0, w: 4, h: 6 },
          { name: 'Family lounge', x: 0, y: 6, w: 6, h: 6 },
          { name: 'Bedroom 3', x: 6, y: 6, w: 4, h: 6 },
          { name: 'Bedroom 4', x: 10, y: 6, w: 4, h: 4 },
          { name: 'Bath', x: 10, y: 10, w: 4, h: 2 },
        ],
      },
      {
        label: 'Lot plan',
        widthM: 20,
        depthM: 15,
        rooms: [
          { name: 'House footprint', x: 3, y: 1.5, w: 14, h: 12 },
          { name: 'Driveway', x: 0, y: 1.5, w: 3, h: 6 },
          { name: 'Garden', x: 17, y: 0, w: 3, h: 15 },
        ],
      },
    ],
  },
  {
    listingId: 'd3000000-0000-4000-8000-000000000012',
    tourId: 'd4000000-0000-4000-8000-000000000012',
    scenes: [
      { id: 'd5000000-0000-4000-8000-000000000121', label: 'Bedroom & balcony', pano: 'relax_inn_seaview_suite', startYaw: 40, forwardYaw: -160 },
      { id: 'd5000000-0000-4000-8000-000000000122', label: 'Residents\' lounge', pano: 'wooden_lounge', startYaw: 180, backYaw: 30 },
    ],
    photos: [
      { pano: 'relax_inn_seaview_suite', yaw: 40 },
      { pano: 'relax_inn_seaview_suite', yaw: 95 },
      { pano: 'wooden_lounge', yaw: 180 },
    ],
    floorPlans: [
      {
        label: 'Unit plan',
        widthM: 12,
        depthM: 9,
        rooms: [
          { name: 'Living & dining', x: 0, y: 0, w: 7, h: 5 },
          { name: 'Kitchen', x: 7, y: 0, w: 5, h: 3 },
          { name: 'Master bedroom', x: 0, y: 5, w: 5, h: 4 },
          { name: 'Bedroom 2', x: 5, y: 5, w: 3.5, h: 4 },
          { name: 'Bedroom 3', x: 8.5, y: 5, w: 3.5, h: 4 },
          { name: 'Bath', x: 7, y: 3, w: 2.5, h: 2 },
          { name: 'Bath', x: 9.5, y: 3, w: 2.5, h: 2 },
        ],
      },
    ],
  },
  {
    listingId: 'd3000000-0000-4000-8000-000000000013',
    tourId: null,
    scenes: [],
    photos: [
      { pano: 'small_empty_room_1', yaw: 30 },
      { pano: 'small_empty_room_2', yaw: 240 },
      { pano: 'small_empty_room_1', yaw: 250 },
    ],
    floorPlans: [
      {
        label: 'Two-bedroom unit',
        widthM: 10,
        depthM: 7.5,
        rooms: [
          { name: 'Living & dining', x: 0, y: 0, w: 6, h: 4 },
          { name: 'Kitchen', x: 6, y: 0, w: 4, h: 2.5 },
          { name: 'Bath', x: 6, y: 2.5, w: 2, h: 1.5 },
          { name: 'Bath', x: 8, y: 2.5, w: 2, h: 1.5 },
          { name: 'Master bedroom', x: 0, y: 4, w: 5.5, h: 3.5 },
          { name: 'Bedroom 2', x: 5.5, y: 4, w: 4.5, h: 3.5 },
        ],
      },
    ],
  },
  {
    org: REALTY,
    listingId: 'd3000000-0000-4000-8000-000000000014',
    tourId: 'd4000000-0000-4000-8000-000000000014',
    scenes: [
      { id: 'd5000000-0000-4000-8000-000000000141', label: 'Living & kitchen', pano: 'small_empty_house', startYaw: 30 },
    ],
    photos: [
      { pano: 'small_empty_house', yaw: 30 },
      { pano: 'small_empty_house', yaw: 210 },
      { pano: 'small_empty_house', yaw: 120 },
    ],
  },
];


async function ensurePanorama(name: string): Promise<Buffer> {
  const file = path.join(cacheDir, `${name}.jpg`);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const url = `https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/${name}.jpg`;
    console.log(`Downloading ${name} (CC0, Poly Haven)…`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not download ${url}: ${response.status}`);
    const source = Buffer.from(await response.arrayBuffer());
    const resized = await sharp(source, { limitInputPixels: false })
      .resize(4096, 2048)
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
    fs.writeFileSync(file, resized);
  }
  return fs.readFileSync(file);
}

async function signIn(org: string): Promise<string> {
  const credentials = CREDENTIALS[org]!;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: PUBLISHABLE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
  });
  const body = (await response.json()) as { access_token?: string; error_description?: string; msg?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(`Demo owner sign-in failed: ${body.error_description ?? body.msg ?? response.status}. Run supabase/demo/seed-demo.sql first.`);
  }
  return body.access_token;
}

async function upload(token: string, bucket: string, objectPath: string, body: Buffer, contentType: string) {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${objectPath}`, {
    method: 'POST',
    headers: {
      apikey: PUBLISHABLE_KEY,
      authorization: `Bearer ${token}`,
      'content-type': contentType,
      'cache-control': 'max-age=31536000',
      'x-upsert': 'true',
    },
    body: new Uint8Array(body),
  });
  if (!response.ok) {
    throw new Error(`Upload of ${bucket}/${objectPath} failed (${response.status}): ${await response.text()}`);
  }
}

async function inBatches<T>(items: readonly T[], size: number, work: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(work));
  }
}

const q = (value: string | number | null) =>
  value === null ? 'null' : typeof value === 'number' ? String(value) : `'${value.replace(/'/g, "''")}'`;

const publicUrl = (bucket: string, objectPath: string) => `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objectPath}`;

async function main() {
  const tokens = new Map<string, string>();
  const tokenFor = async (org: string) => {
    if (!tokens.has(org)) tokens.set(org, await signIn(org));
    return tokens.get(org)!;
  };
  const processor = sharpPanoramaProcessor();
  const statements: string[] = ['begin;'];
  const equirects = new Map<string, Awaited<ReturnType<typeof loadEquirect>>>();

  for (const listing of LISTINGS) {
    const ORG = listing.org ?? DEMO_ORG;
    const token = await tokenFor(ORG);
    console.log(`Listing ${listing.listingId}`);
    statements.push(`select set_config('app.organization_id', ${q(ORG)}, true);`);
    statements.push(
      `delete from media_assets where organization_id = ${q(ORG)} and listing_id = ${q(listing.listingId)} and kind in ('PHOTO', 'FLOOR_PLAN');`,
    );

    for (const [index, plan] of (listing.floorPlans ?? []).entries()) {
      const png = await sharp(Buffer.from(floorPlanSvg(plan))).png({ compressionLevel: 9 }).toBuffer();
      const objectPath = `${ORG}/listings/${listing.listingId}/plan-${index + 1}.png`;
      await upload(token, 'listing-media', objectPath, png, 'image/png');
      statements.push(
        `insert into media_assets (organization_id, listing_id, kind, storage_url, storage_path, content_type, size_bytes, position, label) values (${q(ORG)}, ${q(listing.listingId)}, 'FLOOR_PLAN', ${q(publicUrl('listing-media', objectPath))}, ${q(objectPath)}, 'image/png', ${png.length}, ${index}, ${q(plan.label)}) on conflict (storage_path) where storage_path is not null do update set listing_id = excluded.listing_id, storage_url = excluded.storage_url, position = excluded.position, size_bytes = excluded.size_bytes, kind = excluded.kind, label = excluded.label;`,
      );
    }

    for (const [index, view] of listing.photos.entries()) {
      if (!equirects.has(view.pano)) equirects.set(view.pano, await loadEquirect(await ensurePanorama(view.pano)));
      const jpeg = await renderView(equirects.get(view.pano)!, {
        yaw: view.yaw,
        pitch: view.pitch ?? -6,
        fov: view.fov ?? 82,
        width: 1600,
        height: 1066,
      });
      const objectPath = `${ORG}/listings/${listing.listingId}/demo-${index + 1}.jpg`;
      await upload(token, 'listing-media', objectPath, jpeg, 'image/jpeg');
      statements.push(
        `insert into media_assets (organization_id, listing_id, kind, storage_url, storage_path, content_type, size_bytes, position) values (${q(ORG)}, ${q(listing.listingId)}, 'PHOTO', ${q(publicUrl('listing-media', objectPath))}, ${q(objectPath)}, 'image/jpeg', ${jpeg.length}, ${index}) on conflict (storage_path) where storage_path is not null do update set listing_id = excluded.listing_id, storage_url = excluded.storage_url, position = excluded.position, size_bytes = excluded.size_bytes;`,
      );
    }

    if (!listing.tourId) continue;
    statements.push(`delete from tour_hotspots where organization_id = ${q(ORG)} and scene_id in (select id from tour_scenes where tour_id = ${q(listing.tourId)});`);
    statements.push(`update virtual_tours set entry_scene_id = null where id = ${q(listing.tourId)};`);
    statements.push(`delete from tour_scenes where organization_id = ${q(ORG)} and tour_id = ${q(listing.tourId)};`);

    for (const [position, scene] of listing.scenes.entries()) {
      console.log(`  Scene ${scene.label}`);
      const source = await ensurePanorama(scene.pano);
      const processed = await processor.process(source);
      const prefix = `${ORG}/${listing.tourId}/${scene.id}`;
      const objects = [
        { path: `${prefix}/source`, body: processed.archive, type: 'image/jpeg' },
        { path: `${prefix}/preview.webp`, body: processed.preview, type: 'image/webp' },
        { path: `${prefix}/thumb.webp`, body: processed.thumbnail, type: 'image/webp' },
        ...processed.tiles.map((tile) => ({
          path: `${prefix}/tiles/${tile.level}/${tile.x}_${tile.y}.webp`,
          body: tile.body,
          type: 'image/webp',
        })),
      ];
      await inBatches(objects, 8, (object) => upload(token, 'tour-media', object.path, object.body, object.type));

      statements.push(
        `insert into tour_scenes (id, organization_id, tour_id, label, position, state, source_path, preview_path, thumbnail_path, tile_prefix, tile_levels, width_px, height_px, processed_at, initial_yaw) values (${q(scene.id)}, ${q(ORG)}, ${q(listing.tourId)}, ${q(scene.label)}, ${position}, 'READY', ${q(`${prefix}/source`)}, ${q(`${prefix}/preview.webp`)}, ${q(`${prefix}/thumb.webp`)}, ${q(`${prefix}/tiles`)}, ${processed.levels}, ${processed.widthPx}, ${processed.heightPx}, now(), ${scene.startYaw ?? 0});`,
      );
    }

    for (const [index, scene] of listing.scenes.entries()) {
      const next = listing.scenes[index + 1];
      const previous = listing.scenes[index - 1];
      if (next) {
        statements.push(
          `insert into tour_hotspots (organization_id, scene_id, kind, yaw, pitch, label, target_scene_id) values (${q(ORG)}, ${q(scene.id)}, 'NAVIGATION', ${scene.forwardYaw ?? 90}, -8, ${q(next.label)}, ${q(next.id)});`,
        );
      }
      if (previous) {
        statements.push(
          `insert into tour_hotspots (organization_id, scene_id, kind, yaw, pitch, label, target_scene_id) values (${q(ORG)}, ${q(scene.id)}, 'NAVIGATION', ${scene.backYaw ?? -90}, -8, ${q(previous.label)}, ${q(previous.id)});`,
        );
      }
    }

    statements.push(
      `update virtual_tours set state = 'PUBLISHED', scene_count = ${listing.scenes.length}, entry_scene_id = ${q(listing.scenes[0]!.id)} where id = ${q(listing.tourId)};`,
    );
  }

  statements.push('commit;');
  fs.mkdirSync(path.dirname(outputSql), { recursive: true });
  fs.writeFileSync(outputSql, `${statements.join('\n')}\n`);
  console.log(`Wrote ${path.relative(repoRoot, outputSql)}`);

  if (APPLY) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('Set DATABASE_URL to apply the generated SQL');
    const sql = postgres(url, { max: 1, prepare: !url.includes('pooler.supabase.com') });
    try {
      await sql.unsafe(statements.join('\n'));
      console.log('Applied demo media rows.');
    } finally {
      await sql.end({ timeout: 5 });
    }
  } else {
    console.log('Run the generated SQL in the Supabase SQL editor, or re-run with --apply and DATABASE_URL set.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
