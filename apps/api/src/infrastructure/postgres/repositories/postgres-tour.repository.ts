import type postgres from 'postgres';
import { sql } from '@/infrastructure/postgres/db.ts';
import {
  SceneNotFoundError,
  TourNotFoundError,
  type TourRepository,
} from '@/application/ports/repositories/tour-repository.port.ts';
import { deriveTourState } from '@/domain/tours/tour.ts';
import type {
  Hotspot,
  Scene,
  Tour,
  TourState,
} from '@/domain/tours/tour.ts';

interface TourRow {
  id: string;
  organization_id: string;
  resource_id: string;
  state: TourState;
  entry_scene_id: string | null;
}

interface SceneRow {
  id: string;
  label: string;
  position: number;
  state: Scene['state'];
  failure_reason: string | null;
  preview_path: string | null;
  thumbnail_path: string | null;
  tile_prefix: string | null;
  tile_levels: number;
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
          select id, organization_id, resource_id, state, entry_scene_id
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
          select id, organization_id, resource_id, state, entry_scene_id
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
          select id, organization_id, resource_id, state, entry_scene_id
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
          returning id, organization_id, resource_id, state, entry_scene_id
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
          returning id, label, position, state, failure_reason,
                    preview_path, thumbnail_path, tile_prefix, tile_levels
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
          returning id, label, position, state, failure_reason,
                    preview_path, thumbnail_path, tile_prefix, tile_levels
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
          returning id, label, position, state, failure_reason,
                    preview_path, thumbnail_path, tile_prefix, tile_levels
        `;
        if (!row) throw new SceneNotFoundError('No such room');
        return toScene(row, []);
      }) as Promise<Scene>;
    },

    async renameScene({ organizationId, sceneId, label }) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;

        const [row] = await tx<SceneRow[]>`
          update tour_scenes set label = ${label}
           where id = ${sceneId} and organization_id = ${organizationId}
          returning id, label, position, state, failure_reason,
                    preview_path, thumbnail_path, tile_prefix, tile_levels
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

    async removeHotspot({ organizationId, hotspotId }) {
      await sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;
        await tx`
          delete from tour_hotspots
           where id = ${hotspotId} and organization_id = ${organizationId}
        `;
      });
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
          select id, organization_id, resource_id, state, entry_scene_id
            from virtual_tours
           where id = ${tourId} and organization_id = ${organizationId}
        `;
        if (!tour) return;

        const scenes = await tx<SceneRow[]>`
          select id, label, position, state, failure_reason,
                 preview_path, thumbnail_path, tile_prefix, tile_levels
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
    previewPath: row.preview_path,
    thumbnailPath: row.thumbnail_path,
    tilePrefix: row.tile_prefix,
    tileLevels: row.tile_levels,
    hotspots,
  };
}

async function assemble(
  tx: postgres.TransactionSql,
  tour: TourRow,
): Promise<Tour> {
  const scenes = await tx<SceneRow[]>`
    select id, label, position, state, failure_reason,
           preview_path, thumbnail_path, tile_prefix, tile_levels
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
