import type postgres from 'postgres';
import { sql } from '@/infrastructure/postgres/db.ts';
import {
  SceneNotFoundError,
  TourNotFoundError,
  type TourOverview,
  type TourRepository,
} from '@/application/ports/repositories/tour-repository.port.ts';
import { deriveTourState } from '@/domain/tours/tour.ts';
import type {
  Hotspot,
  Scene,
  Tour,
  TourProvider,
  TourState,
} from '@/domain/tours/tour.ts';

interface TourRow {
  id: string;
  organization_id: string;
  resource_id: string;
  state: TourState;
  entry_scene_id: string | null;
  provider: TourProvider;
  external_model_id: string | null;
}

const TOUR_COLUMNS = sql`id, organization_id, resource_id, state, entry_scene_id, provider, external_model_id`;
const SCENE_COLUMNS = sql`id, label, position, state, failure_reason, source_path, preview_path, thumbnail_path, tile_prefix, tile_levels, initial_yaw, initial_pitch, initial_fov`;

interface SceneRow {
  id: string;
  label: string;
  position: number;
  state: Scene['state'];
  failure_reason: string | null;
  source_path: string | null;
  preview_path: string | null;
  thumbnail_path: string | null;
  tile_prefix: string | null;
  tile_levels: number;
  initial_yaw: number;
  initial_pitch: number;
  initial_fov: number;
}

interface HotspotRow {
  id: string;
  scene_id: string;
  kind: Hotspot['kind'];
  yaw: number;
  pitch: number;
  label: string;
  target_scene_id: string | null;
}

export function postgresTourRepository(): TourRepository {
  return {
    async publishedForResource(resourceId) {
      return sql.begin(async (tx) => {
        // Unscoped: the public policies allow a published tour on a published
        // listing, and only its READY scenes.
        const [tour] = await tx<TourRow[]>`
          select ${TOUR_COLUMNS}
            from virtual_tours
           where resource_id = ${resourceId} and state = 'PUBLISHED'
        `;
        if (!tour) return null;

        return assemble(tx, tour);
      }) as Promise<Tour | null>;
    },

    async forOrganization(organizationId, tourId) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;

        const [tour] = await tx<TourRow[]>`
          select ${TOUR_COLUMNS}
            from virtual_tours
           where id = ${tourId} and organization_id = ${organizationId}
        `;
        if (!tour) return null;

        return assemble(tx, tour);
      }) as Promise<Tour | null>;
    },

    async publicTilePrefix(sceneId) {
      // Unscoped: `scene_public_read` allows only READY scenes of a published
      // tour on a published listing, which is exactly the rule for tiles.
      const rows = await sql<{ tile_prefix: string | null }[]>`
        select tile_prefix from tour_scenes where id = ${sceneId}
      `;
      return rows[0]?.tile_prefix ?? null;
    },

    async ensureForResource(organizationId, resourceId) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;

        // A tour hangs off the resource, not the listing: a hybrid unit has two
        // listings over one set of rooms, and both show the same walkthrough.
        const [existing] = await tx<TourRow[]>`
          select ${TOUR_COLUMNS}
            from virtual_tours
           where resource_id = ${resourceId}
             and organization_id = ${organizationId}
        `;
        if (existing) return assemble(tx, existing);

        const [created] = await tx<TourRow[]>`
          insert into virtual_tours (organization_id, resource_id, state, scene_count)
          select ${organizationId}, r.id, 'DRAFT', 0
            from rentable_resources r
           where r.id = ${resourceId} and r.organization_id = ${organizationId}
          returning ${TOUR_COLUMNS}
        `;
        if (!created) {
          throw new TourNotFoundError('No such resource in this organization');
        }
        return assemble(tx, created);
      }) as Promise<Tour>;
    },

    async addScene({ organizationId, tourId, label }) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;

        const [row] = await tx<SceneRow[]>`
          insert into tour_scenes (organization_id, tour_id, label, position, state)
          select ${organizationId}, ${tourId}, ${label},
                 coalesce(
                   (select max(position) + 1 from tour_scenes where tour_id = ${tourId}),
                   0),
                 'UPLOADING'
            from virtual_tours t
           where t.id = ${tourId} and t.organization_id = ${organizationId}
          returning ${SCENE_COLUMNS}
        `;
        if (!row) throw new TourNotFoundError('No such tour');
        return toScene(row, []);
      }) as Promise<Scene>;
    },

    async markSceneReady({ organizationId, sceneId, paths }) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;

        const [row] = await tx<SceneRow[]>`
          update tour_scenes
             set state = 'READY', failure_reason = null,
                 source_path = ${paths.sourcePath},
                 preview_path = ${paths.previewPath},
                 thumbnail_path = ${paths.thumbnailPath},
                 tile_prefix = ${paths.tilePrefix},
                 tile_levels = ${paths.tileLevels},
                 width_px = ${paths.widthPx},
                 height_px = ${paths.heightPx},
                 processed_at = now()
           where id = ${sceneId} and organization_id = ${organizationId}
          returning ${SCENE_COLUMNS}
        `;
        if (!row) throw new SceneNotFoundError('No such room');
        return toScene(row, []);
      }) as Promise<Scene>;
    },

    async markSceneFailed({ organizationId, sceneId, reason }) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;

        const [row] = await tx<SceneRow[]>`
          update tour_scenes
             set state = 'FAILED', failure_reason = ${reason},
                 preview_path = null, tile_prefix = null, tile_levels = 0
           where id = ${sceneId} and organization_id = ${organizationId}
          returning ${SCENE_COLUMNS}
        `;
        if (!row) throw new SceneNotFoundError('No such room');
        return toScene(row, []);
      }) as Promise<Scene>;
    },

    async renameScene({ organizationId, tourId, sceneId, label }) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;

        const [row] = await tx<SceneRow[]>`
          update tour_scenes set label = ${label}
           where id = ${sceneId} and tour_id = ${tourId} and organization_id = ${organizationId}
          returning ${SCENE_COLUMNS}
        `;
        if (!row) throw new SceneNotFoundError('No such room');
        return toScene(row, []);
      }) as Promise<Scene>;
    },

    async reorderScenes({ organizationId, tourId, sceneIdsInOrder }) {
      await sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;

        // One statement rather than one per scene: a half-applied order is a
        // walkthrough that jumps rooms, and the owner would have to guess
        // which save failed.
        await tx`
          update tour_scenes s
             set position = ordered.position
            from (
              select id, ordinality - 1 as position
                from unnest(${tx.array([...sceneIdsInOrder])}::uuid[])
                     with ordinality as t(id, ordinality)
            ) as ordered
           where s.id = ordered.id
             and s.tour_id = ${tourId}
             and s.organization_id = ${organizationId}
        `;
      });
    },

    async setEntryScene({ organizationId, tourId, sceneId }) {
      await sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;

        // The scene has to belong to this tour. Pointing a tour's entry at
        // another tour's room would pass a foreign key and break I-07.
        const [scene] = await tx<{ id: string }[]>`
          select id from tour_scenes
           where id = ${sceneId} and tour_id = ${tourId}
             and organization_id = ${organizationId}
        `;
        if (!scene) throw new SceneNotFoundError('That room is not in this tour');

        await tx`
          update virtual_tours set entry_scene_id = ${sceneId}
           where id = ${tourId} and organization_id = ${organizationId}
        `;
      });
    },

    async addHotspot(input) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${input.organizationId}, true)`;

        const [inTour] = await tx<{ id: string }[]>`
          select id from tour_scenes
           where id = ${input.sceneId} and tour_id = ${input.tourId} and organization_id = ${input.organizationId}
        `;
        if (!inTour) throw new SceneNotFoundError('That room is not in this tour');

        if (input.targetSceneId) {
          // Same-tour check, for the same reason as the entry scene.
          const [ok] = await tx<{ n: string }[]>`
            select count(*)::text as n
              from tour_scenes a
              join tour_scenes b on b.tour_id = a.tour_id
             where a.id = ${input.sceneId} and b.id = ${input.targetSceneId}
          `;
          if (Number(ok?.n ?? '0') === 0) {
            throw new SceneNotFoundError(
              'A door must lead to a room in the same tour',
            );
          }
        }

        const [row] = await tx<{ id: string }[]>`
          insert into tour_hotspots (
            organization_id, scene_id, kind, yaw, pitch, label, target_scene_id
          ) values (
            ${input.organizationId}, ${input.sceneId}, ${input.kind},
            ${input.yaw}, ${input.pitch}, ${input.label}, ${input.targetSceneId}
          )
          returning id
        `;
        if (!row) throw new SceneNotFoundError('No such room');
        return row.id;
      }) as Promise<string>;
    },

    async removeHotspot({ organizationId, tourId, hotspotId }) {
      await sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;
        await tx`
          delete from tour_hotspots h
           using tour_scenes s
           where h.id = ${hotspotId} and h.organization_id = ${organizationId}
             and s.id = h.scene_id and s.tour_id = ${tourId}
        `;
      });
    },

    async updateHotspot(input) {
      await sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${input.organizationId}, true)`;
        const [hotspot] = await tx<{ scene_id: string; kind: string }[]>`
          select h.scene_id, h.kind from tour_hotspots h
            join tour_scenes s on s.id = h.scene_id
           where h.id = ${input.hotspotId} and s.tour_id = ${input.tourId}
             and h.organization_id = ${input.organizationId}
        `;
        if (!hotspot) throw new SceneNotFoundError('That door is not in this tour');
        if (hotspot.kind === 'NAVIGATION') {
          if (!input.targetSceneId || input.targetSceneId === hotspot.scene_id) {
            throw new SceneNotFoundError('A door must lead to another room');
          }
          const [target] = await tx<{ id: string }[]>`
            select id from tour_scenes where id = ${input.targetSceneId} and tour_id = ${input.tourId}
          `;
          if (!target) throw new SceneNotFoundError('A door must lead to a room in the same tour');
        }
        await tx`
          update tour_hotspots set
            yaw = ${input.yaw},
            pitch = ${input.pitch},
            label = ${input.label},
            target_scene_id = ${hotspot.kind === 'NAVIGATION' ? input.targetSceneId : null}
          where id = ${input.hotspotId}
        `;
        await tx`update virtual_tours set updated_at = now() where id = ${input.tourId}`;
      });
    },

    async setSceneView(input) {
      await sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${input.organizationId}, true)`;
        const updated = await tx`
          update tour_scenes set initial_yaw = ${input.yaw}, initial_pitch = ${input.pitch}, initial_fov = ${input.fov}
           where id = ${input.sceneId} and tour_id = ${input.tourId} and organization_id = ${input.organizationId}
          returning id
        `;
        if (updated.length === 0) throw new SceneNotFoundError('That room is not in this tour');
      });
    },

    async removeScene(input) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${input.organizationId}, true)`;
        const [scene] = await tx<{ id: string; source_path: string | null }[]>`
          select id, source_path from tour_scenes
           where id = ${input.sceneId} and tour_id = ${input.tourId} and organization_id = ${input.organizationId}
        `;
        if (!scene) throw new SceneNotFoundError('That room is not in this tour');
        await tx`
          delete from tour_hotspots
           where target_scene_id = ${input.sceneId} and organization_id = ${input.organizationId}
        `;
        await tx`delete from tour_scenes where id = ${input.sceneId}`;
        await tx`
          with ordered as (
            select id, row_number() over (order by position, created_at) - 1 as pos
              from tour_scenes where tour_id = ${input.tourId}
          )
          update tour_scenes s set position = ordered.pos from ordered where s.id = ordered.id
        `;
        await tx`update virtual_tours set updated_at = now() where id = ${input.tourId}`;
        return { storagePrefix: `${input.organizationId}/${input.tourId}/${input.sceneId}` };
      }) as Promise<{ readonly storagePrefix: string | null }>;
    },

    async setProvider(input) {
      await sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${input.organizationId}, true)`;
        const updated = await tx`
          update virtual_tours set
            provider = ${input.provider},
            external_model_id = ${input.externalModelId},
            updated_at = now()
          where id = ${input.tourId} and organization_id = ${input.organizationId}
          returning id
        `;
        if (updated.length === 0) throw new TourNotFoundError('No such tour');
      });
    },

    async overviewForOrganization(organizationId) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;
        const rows = await tx<{
          tour_id: string | null;
          resource_id: string;
          listing_id: string;
          listing_title: string;
          listing_intent: string;
          listing_state: string;
          listing_photo: string | null;
          provider: TourProvider | null;
          state: TourState | null;
          scene_count: number | null;
          thumbnail_path: string | null;
        }[]>`
          select t.id as tour_id, l.resource_id, l.id as listing_id, l.title as listing_title,
                 l.intent as listing_intent, l.state as listing_state,
                 (select m.storage_url from media_assets m where m.listing_id = l.id and m.kind = 'PHOTO'
                   order by m.position limit 1) as listing_photo,
                 t.provider, t.state, t.scene_count,
                 (select s.thumbnail_path from tour_scenes s
                   where s.tour_id = t.id and s.state = 'READY'
                   order by (s.id = t.entry_scene_id) desc, s.position limit 1) as thumbnail_path
            from listings l
            left join virtual_tours t on t.resource_id = l.resource_id
           where l.organization_id = ${organizationId} and l.state <> 'ARCHIVED'
           order by l.updated_at desc
        `;
        return rows.map<TourOverview>((row) => ({
          tourId: row.tour_id,
          resourceId: row.resource_id,
          listingId: row.listing_id,
          listingTitle: row.listing_title,
          listingIntent: row.listing_intent === 'SALE' ? 'SALE' : 'RENT',
          listingState: row.listing_state,
          listingPhoto: row.listing_photo,
          provider: row.provider ?? 'PLATFORM',
          state: row.state ?? 'NONE',
          sceneCount: row.scene_count ?? 0,
          thumbnailPath: row.thumbnail_path,
        }));
      }) as Promise<readonly TourOverview[]>;
    },

    async resourceForListing(organizationId, listingId) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;
        const [row] = await tx<{ resource_id: string }[]>`
          select resource_id from listings where id = ${listingId} and organization_id = ${organizationId}
        `;
        return row?.resource_id ?? null;
      }) as Promise<string | null>;
    },

    async setPublished({ organizationId, tourId, published }) {
      await sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;
        await tx`
          update virtual_tours
             set state = ${published ? 'PUBLISHED' : 'UNPUBLISHED'}
           where id = ${tourId} and organization_id = ${organizationId}
        `;
      });
    },

    async refreshTourState({ organizationId, tourId }) {
      await sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;

        const [tour] = await tx<TourRow[]>`
          select ${TOUR_COLUMNS}
            from virtual_tours
           where id = ${tourId} and organization_id = ${organizationId}
        `;
        if (!tour) return;

        const scenes = await tx<SceneRow[]>`
          select ${SCENE_COLUMNS}
            from tour_scenes where tour_id = ${tourId} order by position
        `;

        // Derived, never set by hand: a tour claiming READY while a room is
        // still processing is the disagreement the owner finds by publishing.
        const next = deriveTourState(
          scenes.map((scene) => toScene(scene, [])),
          tour.state === 'PUBLISHED',
        );

        await tx`
          update virtual_tours
             set state = ${next}, scene_count = ${scenes.length}
           where id = ${tourId}
        `;
      });
    },
  };
}

/** One scene row as the domain sees it. */
function toScene(row: SceneRow, hotspots: Hotspot[]): Scene {
  return {
    id: row.id,
    label: row.label,
    position: row.position,
    state: row.state,
    failureReason: row.failure_reason,
    sourcePath: row.source_path ?? null,
    previewPath: row.preview_path,
    thumbnailPath: row.thumbnail_path,
    tilePrefix: row.tile_prefix,
    tileLevels: row.tile_levels,
    hotspots,
    initialYaw: Number(row.initial_yaw ?? 0),
    initialPitch: Number(row.initial_pitch ?? 0),
    initialFov: Number(row.initial_fov ?? 75),
  };
}

async function assemble(
  tx: postgres.TransactionSql,
  tour: TourRow,
): Promise<Tour> {
  const scenes = await tx<SceneRow[]>`
    select ${SCENE_COLUMNS}
      from tour_scenes
     where tour_id = ${tour.id}
     order by position
  `;

  const hotspots =
    scenes.length === 0
      ? []
      : await tx<HotspotRow[]>`
          select id, scene_id, kind, yaw, pitch, label, target_scene_id
            from tour_hotspots
           where scene_id = any(${tx.array(scenes.map((s) => s.id))}::uuid[])
        `;

  return {
    id: tour.id,
    organizationId: tour.organization_id,
    resourceId: tour.resource_id,
    state: tour.state,
    entrySceneId: tour.entry_scene_id,
    provider: tour.provider,
    externalModelId: tour.external_model_id,
    scenes: scenes.map<Scene>((scene) =>
      toScene(
        scene,
        hotspots
          .filter((hotspot) => hotspot.scene_id === scene.id)
          .map<Hotspot>((hotspot) => ({
            id: hotspot.id,
            kind: hotspot.kind,
            yaw: Number(hotspot.yaw),
            pitch: Number(hotspot.pitch),
            label: hotspot.label,
            targetSceneId: hotspot.target_scene_id,
          })),
      ),
    ),
  };
}
