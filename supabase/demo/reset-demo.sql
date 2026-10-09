begin;

create temporary table demo_org on commit drop as
select unnest(array[
  'd0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000002'
]::uuid[]) as id;

create temporary table demo_users on commit drop as
select unnest(array[
  'd0000000-0000-4000-8000-0000000000a1',
  'd0000000-0000-4000-8000-0000000000c1',
  'd0000000-0000-4000-8000-0000000000e1',
  'd0000000-0000-4000-8000-0000000000b1'
]::uuid[]) as id;

create temporary table seeded_resources on commit drop as
select unnest(array[
  'd2000000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000002',
  'd2000000-0000-4000-8000-000000000003',
  'd2000000-0000-4000-8000-000000000004',
  'd2000000-0000-4000-8000-000000000005',
  'd2000000-0000-4000-8000-000000000011',
  'd2000000-0000-4000-8000-000000000012',
  'd2000000-0000-4000-8000-000000000013',
  'd2000000-0000-4000-8000-000000000014',
  'd2000000-0000-4000-8000-000000000021',
  'd2000000-0000-4000-8000-000000000022',
  'd2000000-0000-4000-8000-000000000023'
]::uuid[]) as id;

create temporary table seeded_properties on commit drop as
select unnest(array[
  'd1000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000002',
  'd1000000-0000-4000-8000-000000000003',
  'd1000000-0000-4000-8000-000000000004',
  'd1000000-0000-4000-8000-000000000005',
  'd1000000-0000-4000-8000-000000000011',
  'd1000000-0000-4000-8000-000000000012',
  'd1000000-0000-4000-8000-000000000013',
  'd1000000-0000-4000-8000-000000000014',
  'd1000000-0000-4000-8000-000000000021',
  'd1000000-0000-4000-8000-000000000022',
  'd1000000-0000-4000-8000-000000000023'
]::uuid[]) as id;

create temporary table seeded_listings on commit drop as
select unnest(array[
  'd3000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000002',
  'd3000000-0000-4000-8000-000000000003',
  'd3000000-0000-4000-8000-000000000004',
  'd3000000-0000-4000-8000-000000000005',
  'd3000000-0000-4000-8000-000000000011',
  'd3000000-0000-4000-8000-000000000012',
  'd3000000-0000-4000-8000-000000000013',
  'd3000000-0000-4000-8000-000000000014',
  'd3000000-0000-4000-8000-000000000021',
  'd3000000-0000-4000-8000-000000000022',
  'd3000000-0000-4000-8000-000000000023'
]::uuid[]) as id;

delete from agent_tasks
 where agent_id in (select a.id from agent_profiles a where a.user_id in (select id from demo_users));

delete from viewings
 where organization_id in (select id from demo_org)
    or customer_id in (select id from demo_users);

delete from inquiries
 where organization_id in (select id from demo_org)
    or customer_id in (select id from demo_users);

delete from conversations
 where organization_id in (select id from demo_org)
    or customer_id in (select id from demo_users);

delete from notifications
 where organization_id in (select id from demo_org)
    or user_id in (select id from demo_users);

delete from saved_listings where user_id in (select id from demo_users);
delete from listing_view_events where user_id in (select id from demo_users);

delete from reservations where organization_id in (select id from demo_org);

delete from payment_applications where organization_id in (select id from demo_org);

delete from payments where organization_id in (select id from demo_org);

delete from invoices where organization_id in (select id from demo_org);

delete from stays where organization_id in (select id from demo_org);

delete from occupancies where organization_id in (select id from demo_org);

delete from applications where organization_id in (select id from demo_org);

delete from resource_night_status where organization_id in (select id from demo_org);

delete from listing_representations
 where organization_id in (select id from demo_org)
    or agent_id in (select a.id from agent_profiles a where a.user_id in (select id from demo_users));

delete from user_capabilities
 where capability = 'AGENT'
   and user_id in (select id from demo_users)
   and user_id <> 'd0000000-0000-4000-8000-0000000000b1';

delete from agent_profiles
 where user_id in (select id from demo_users)
   and user_id <> 'd0000000-0000-4000-8000-0000000000b1';

delete from listing_sale_terms
 where organization_id in (select id from demo_org)
   and listing_id not in (select id from seeded_listings);

delete from media_assets
 where organization_id in (select id from demo_org)
   and listing_id is not null
   and listing_id not in (select id from seeded_listings);

delete from listings
 where organization_id in (select id from demo_org)
   and id not in (select id from seeded_listings);

delete from tour_hotspots h
 using tour_scenes s, virtual_tours t
 where h.scene_id = s.id
   and s.tour_id = t.id
   and t.organization_id in (select id from demo_org)
   and t.resource_id not in (select id from seeded_resources);

delete from tour_scenes s
 using virtual_tours t
 where s.tour_id = t.id
   and t.organization_id in (select id from demo_org)
   and t.resource_id not in (select id from seeded_resources);

delete from virtual_tours
 where organization_id in (select id from demo_org)
   and resource_id not in (select id from seeded_resources);

delete from rentable_resources
 where organization_id in (select id from demo_org)
   and id not in (select id from seeded_resources)
   and parent_id is not null;

delete from rentable_resources
 where organization_id in (select id from demo_org)
   and id not in (select id from seeded_resources);

delete from properties
 where organization_id in (select id from demo_org)
   and id not in (select id from seeded_properties);

update user_profiles
   set display_name = case id
         when 'd0000000-0000-4000-8000-0000000000a1' then 'Dana Reyes'
         when 'd0000000-0000-4000-8000-0000000000c1' then 'Carlo Mendoza'
         when 'd0000000-0000-4000-8000-0000000000e1' then 'Bea Santos'
         when 'd0000000-0000-4000-8000-0000000000b1' then 'Maria Santos'
       end
 where id in (select id from demo_users);

commit;
