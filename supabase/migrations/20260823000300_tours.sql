-- Sprint 6 — Virtual tours.
--
-- The differentiator, and on the critical path (D-07). A weak viewer makes the
-- feature decorative, and a dead-end walkthrough on a published listing is
-- worse than no tour at all, because the customer already trusted it.

/**
 * One panorama in a tour.
 *
 * ADR-0009: processed at upload, never at view time. The derivatives — a
 * kilobyte-sized preview, a tile pyramid, a thumbnail — are produced by a
 * worker and recorded here as paths. The viewer downloads the preview first
 * and refines, which is what makes a tour usable on a mid-range phone over
 * mobile data.
 *
 * **Processing state is domain-visible** by design: a failure has to surface to
 * the owner while they are authoring, not to a customer mid-walkthrough.
 */
create table tour_scenes (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id),
  tour_id          uuid not null references virtual_tours(id) on delete cascade,
  label            text not null,
  -- Where this scene sits in the walkthrough the owner authored.
  position         int not null default 0,
  state            text not null default 'UPLOADING' check (state in (
                     'UPLOADING','PROCESSING','READY','FAILED')),
  -- Why it failed, in words an owner can act on.
  failure_reason   text,
  -- The uploaded equirectangular original. Kept because tiles are derived:
  -- re-encoding to a better format later is a reprocess, not a re-shoot.
  source_path      text,
  -- Shown immediately while the tiles stream in.
  preview_path     text,
  thumbnail_path   text,
  -- Tiles live under this prefix as {level}/{x}_{y}.webp
  tile_prefix      text,
  tile_levels      int not null default 0 check (tile_levels >= 0),
  width_px         int,
  height_px        int,
  created_at       timestamptz not null default now(),
  processed_at     timestamptz,

  -- A READY scene is one the viewer can actually open.
  constraint ready_scene_has_pixels check (
    state <> 'READY'
    or (preview_path is not null and tile_prefix is not null and tile_levels > 0)
  ),
  constraint failed_scene_says_why check (
    (state = 'FAILED') = (failure_reason is not null)
  )
);

create index tour_scenes_tour on tour_scenes (tour_id, position);
create index tour_scenes_pending on tour_scenes (state)
  where state in ('UPLOADING','PROCESSING');

/**
 * A door in the walkthrough.
 *
 * Placed at a yaw/pitch on the sphere. A NAVIGATION hotspot moves the customer
 * to another scene; an INFO hotspot just says something.
 *
 * I-07 — tour navigation is total — is about these: a published tour may not
 * contain a navigation hotspot pointing nowhere. The aggregate enforces it, and
 * the foreign key below makes the "same tour" half structural.
 */
create table tour_hotspots (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id),
  scene_id         uuid not null references tour_scenes(id) on delete cascade,
  kind             text not null check (kind in ('NAVIGATION','INFO')),
  -- Degrees. Yaw wraps; pitch does not.
  yaw              double precision not null
                   check (yaw >= -180 and yaw <= 180),
  pitch            double precision not null
                   check (pitch >= -90 and pitch <= 90),
  label            text not null default '',
  -- Set for NAVIGATION, null for INFO.
  target_scene_id  uuid references tour_scenes(id) on delete restrict,
  created_at       timestamptz not null default now(),

  constraint navigation_has_target check (
    (kind = 'NAVIGATION') = (target_scene_id is not null)
  ),
  -- A hotspot that sends you back where you already are is a bug, not a door.
  constraint navigation_goes_somewhere_else check (
    target_scene_id is null or target_scene_id <> scene_id
  )
);

create index tour_hotspots_scene on tour_hotspots (scene_id);
create index tour_hotspots_target on tour_hotspots (target_scene_id)
  where target_scene_id is not null;

-- Which scene the walkthrough opens on. Null until the owner picks one; I-07
-- requires it before the tour may be published.
alter table virtual_tours
  add column entry_scene_id uuid references tour_scenes(id) on delete set null;

alter table tour_scenes    enable row level security;
alter table tour_hotspots  enable row level security;

create policy org_isolation on tour_scenes using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
create policy org_isolation on tour_hotspots using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);

-- A customer may walk the tour of a published listing, and only a READY scene:
-- an unprocessed panorama is not something to show anybody.
create policy scene_public_read on tour_scenes for select using (
  state = 'READY'
  and exists (
    select 1
      from virtual_tours t
      join listings l on l.resource_id = t.resource_id and l.state = 'PUBLISHED'
     where t.id = tour_scenes.tour_id
       and t.state = 'PUBLISHED'
  )
);

create policy hotspot_public_read on tour_hotspots for select using (
  exists (
    select 1
      from tour_scenes s
      join virtual_tours t on t.id = s.tour_id and t.state = 'PUBLISHED'
      join listings l on l.resource_id = t.resource_id and l.state = 'PUBLISHED'
     where s.id = tour_hotspots.scene_id
       and s.state = 'READY'
  )
);

grant select, insert, update on tour_scenes to rental_app;
grant select, insert, update, delete on tour_hotspots to rental_app;
