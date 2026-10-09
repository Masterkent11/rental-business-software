alter table virtual_tours add column if not exists provider text not null default 'PLATFORM';
alter table virtual_tours drop constraint if exists virtual_tours_provider_check;
alter table virtual_tours add constraint virtual_tours_provider_check check (provider in ('PLATFORM', 'MATTERPORT'));

alter table virtual_tours add column if not exists external_model_id text;
alter table virtual_tours drop constraint if exists virtual_tours_external_model_format;
alter table virtual_tours add constraint virtual_tours_external_model_format check (
  external_model_id is null or external_model_id ~ '^[A-Za-z0-9]{8,24}$'
);
alter table virtual_tours drop constraint if exists virtual_tours_external_model_required;
alter table virtual_tours add constraint virtual_tours_external_model_required check (
  provider = 'PLATFORM' or external_model_id is not null
);

alter table virtual_tours add column if not exists updated_at timestamptz not null default now();

alter table tour_scenes add column if not exists initial_yaw double precision not null default 0;
alter table tour_scenes add column if not exists initial_pitch double precision not null default 0;
alter table tour_scenes add column if not exists initial_fov double precision not null default 75;
alter table tour_scenes drop constraint if exists tour_scenes_initial_view_check;
alter table tour_scenes add constraint tour_scenes_initial_view_check check (
  initial_yaw between -180 and 180
  and initial_pitch between -85 and 85
  and initial_fov between 30 and 110
);

alter table media_assets drop constraint if exists media_assets_kind_check;
alter table media_assets add constraint media_assets_kind_check check (kind in ('PHOTO', 'PANORAMA', 'VIDEO', 'FLOOR_PLAN'));
alter table media_assets add column if not exists label text not null default '';
alter table media_assets drop constraint if exists media_assets_label_length;
alter table media_assets add constraint media_assets_label_length check (char_length(label) <= 60);

create or replace function app_private.agent_may_write_listing_media(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  org uuid := app_private.storage_org_from_path(object_name);
  folder text := split_part(object_name, '/', 2);
  third text := split_part(object_name, '/', 3);
begin
  if org is null or folder <> 'listings'
     or third !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return false;
  end if;
  return exists (
    select 1 from public.listing_representations r
      join public.agent_profiles a on a.id = r.agent_id
     where r.listing_id = third::uuid
       and r.organization_id = org
       and r.state = 'ACTIVE'
       and r.can_edit_listing
       and a.user_id = auth.uid()
  );
end $$;

create or replace function app_private.agent_may_write_tour_media(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  org uuid := app_private.storage_org_from_path(object_name);
  second text := split_part(object_name, '/', 2);
begin
  if org is null or second !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return false;
  end if;
  return exists (
    select 1 from public.virtual_tours t
      join public.listings l on l.resource_id = t.resource_id
      join public.listing_representations r on r.listing_id = l.id
      join public.agent_profiles a on a.id = r.agent_id
     where t.id = second::uuid
       and t.organization_id = org
       and r.state = 'ACTIVE'
       and r.can_manage_tour
       and a.user_id = auth.uid()
  );
end $$;

revoke all on function app_private.agent_may_write_listing_media(text) from public, anon;
revoke all on function app_private.agent_may_write_tour_media(text) from public, anon;
grant execute on function app_private.agent_may_write_listing_media(text) to authenticated;
grant execute on function app_private.agent_may_write_tour_media(text) to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    execute 'drop policy if exists listing_media_agent_insert on storage.objects';
    execute $p$create policy listing_media_agent_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'listing-media' and app_private.agent_may_write_listing_media(name))$p$;
    execute 'drop policy if exists listing_media_agent_update on storage.objects';
    execute $p$create policy listing_media_agent_update on storage.objects for update to authenticated
      using (bucket_id = 'listing-media' and app_private.agent_may_write_listing_media(name))$p$;
    execute 'drop policy if exists listing_media_agent_select on storage.objects';
    execute $p$create policy listing_media_agent_select on storage.objects for select to authenticated
      using (bucket_id = 'listing-media' and app_private.agent_may_write_listing_media(name))$p$;
    execute 'drop policy if exists listing_media_agent_delete on storage.objects';
    execute $p$create policy listing_media_agent_delete on storage.objects for delete to authenticated
      using (bucket_id = 'listing-media' and app_private.agent_may_write_listing_media(name))$p$;
    execute 'drop policy if exists tour_media_agent_insert on storage.objects';
    execute $p$create policy tour_media_agent_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'tour-media' and app_private.agent_may_write_tour_media(name))$p$;
    execute 'drop policy if exists tour_media_agent_update on storage.objects';
    execute $p$create policy tour_media_agent_update on storage.objects for update to authenticated
      using (bucket_id = 'tour-media' and app_private.agent_may_write_tour_media(name))$p$;
    execute 'drop policy if exists tour_media_agent_select on storage.objects';
    execute $p$create policy tour_media_agent_select on storage.objects for select to authenticated
      using (bucket_id = 'tour-media' and app_private.agent_may_write_tour_media(name))$p$;
    execute 'drop policy if exists tour_media_agent_delete on storage.objects';
    execute $p$create policy tour_media_agent_delete on storage.objects for delete to authenticated
      using (bucket_id = 'tour-media' and app_private.agent_may_write_tour_media(name))$p$;
    execute 'drop policy if exists tour_media_member_delete on storage.objects';
    execute $p$create policy tour_media_member_delete on storage.objects for delete to authenticated
      using (bucket_id = 'tour-media' and app_private.is_org_member(app_private.storage_org_from_path(name)))$p$;
  end if;
end $$;
