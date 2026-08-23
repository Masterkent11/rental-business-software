-- A walkable tour for the Santos unit.
--
-- Three rooms joined by doors, so I-07 has something real to be true about and
-- the viewer has somewhere to walk. Paths point at objects the processing
-- worker would have written; the byte budget they stand for is measured by
-- apps/api/scripts/panorama-budget.mjs.
insert into tour_scenes (
  id, organization_id, tour_id, label, position, state,
  source_path, preview_path, thumbnail_path, tile_prefix, tile_levels,
  width_px, height_px, processed_at
)
select
  s.id, '11111111-1111-1111-1111-111111111111', t.id, s.label, s.position,
  'READY',
  'tours/' || t.id || '/' || s.id || '/source.jpg',
  'tours/' || t.id || '/' || s.id || '/preview.webp',
  'tours/' || t.id || '/' || s.id || '/thumb.webp',
  'tours/' || t.id || '/' || s.id || '/tiles',
  3, 4096, 2048, now()
from virtual_tours t
cross join (values
  ('d1111111-0000-4000-8000-000000000001'::uuid, 'Living room', 0),
  ('d1111111-0000-4000-8000-000000000002'::uuid, 'Kitchen', 1),
  ('d1111111-0000-4000-8000-000000000003'::uuid, 'Bedroom', 2)
) as s(id, label, position)
where t.resource_id = 'b1111111-0000-0000-0000-000000000001'
on conflict (id) do nothing;

update virtual_tours
   set entry_scene_id = 'd1111111-0000-4000-8000-000000000001',
       state = 'PUBLISHED',
       scene_count = 3
 where resource_id = 'b1111111-0000-0000-0000-000000000001';

-- Doors both ways, so the walkthrough is not a one-way corridor.
insert into tour_hotspots (
  organization_id, scene_id, kind, yaw, pitch, label, target_scene_id
) values
  ('11111111-1111-1111-1111-111111111111',
   'd1111111-0000-4000-8000-000000000001', 'NAVIGATION', 42, -6, 'Kitchen',
   'd1111111-0000-4000-8000-000000000002'),
  ('11111111-1111-1111-1111-111111111111',
   'd1111111-0000-4000-8000-000000000001', 'NAVIGATION', -118, -4, 'Bedroom',
   'd1111111-0000-4000-8000-000000000003'),
  ('11111111-1111-1111-1111-111111111111',
   'd1111111-0000-4000-8000-000000000002', 'NAVIGATION', 165, -5, 'Living room',
   'd1111111-0000-4000-8000-000000000001'),
  ('11111111-1111-1111-1111-111111111111',
   'd1111111-0000-4000-8000-000000000003', 'NAVIGATION', 150, -5, 'Living room',
   'd1111111-0000-4000-8000-000000000001'),
  ('11111111-1111-1111-1111-111111111111',
   'd1111111-0000-4000-8000-000000000002', 'INFO', -20, 8,
   'Inverter aircon, installed 2025', null)
on conflict do nothing;
