create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

create or replace function app_private.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.organization_members m
     where m.organization_id = org
       and m.user_id = auth.uid()
       and m.revoked_at is null
  );
$$;

create or replace function app_private.storage_org_from_path(object_name text)
returns uuid
language plpgsql
immutable
set search_path = pg_temp
as $$
declare
  head text := split_part(object_name, '/', 1);
begin
  if head ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return head::uuid;
  end if;
  return null;
end $$;

revoke all on function app_private.is_org_member(uuid) from public, anon;
revoke all on function app_private.storage_org_from_path(text) from public, anon;
grant execute on function app_private.is_org_member(uuid) to authenticated;
grant execute on function app_private.storage_org_from_path(text) to authenticated;

drop policy if exists participant_realtime_read on conversations;
create policy participant_realtime_read on conversations
  for select to authenticated
  using (customer_id = auth.uid() or app_private.is_org_member(organization_id));

drop policy if exists participant_realtime_read on messages;
create policy participant_realtime_read on messages
  for select to authenticated
  using (
    exists (
      select 1 from conversations c
       where c.id = messages.conversation_id
         and (c.customer_id = auth.uid() or app_private.is_org_member(c.organization_id))
    )
  );

drop policy if exists audience_realtime_read on notifications;
create policy audience_realtime_read on notifications
  for select to authenticated
  using (
    user_id = auth.uid()
    or (user_id is null and app_private.is_org_member(organization_id))
  );

drop policy if exists listing_media_member_insert on storage.objects;
drop policy if exists listing_media_member_update on storage.objects;
drop policy if exists listing_media_member_delete on storage.objects;
drop policy if exists tour_media_member_insert on storage.objects;
drop policy if exists tour_media_member_update on storage.objects;

create policy listing_media_member_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-media'
    and app_private.is_org_member(app_private.storage_org_from_path(name))
  );

create policy listing_media_member_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'listing-media'
    and app_private.is_org_member(app_private.storage_org_from_path(name))
  );

create policy listing_media_member_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-media'
    and app_private.is_org_member(app_private.storage_org_from_path(name))
  );

create policy tour_media_member_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tour-media'
    and app_private.is_org_member(app_private.storage_org_from_path(name))
  );

create policy tour_media_member_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'tour-media'
    and app_private.is_org_member(app_private.storage_org_from_path(name))
  );

drop function if exists public.is_org_member(uuid);
drop function if exists public.storage_org_from_path(text);

alter function public.rebuild_resource_paths() set search_path = public, pg_temp;
alter function public.ledger_is_append_only() set search_path = public, pg_temp;
alter function public.resource_provisional_subtree() set search_path = public, pg_temp;
alter function public.resource_subtree_rebuild() set search_path = public, pg_temp;
alter function public.invoice_assign_number() set search_path = public, pg_temp;
alter function public.invoice_resettle() set search_path = public, pg_temp;
