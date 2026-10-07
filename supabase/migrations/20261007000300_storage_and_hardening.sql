insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-media', 'listing-media', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets set public = true where id = 'tour-media';

drop policy if exists listing_media_member_insert on storage.objects;
drop policy if exists listing_media_member_update on storage.objects;
drop policy if exists listing_media_member_delete on storage.objects;
drop policy if exists tour_media_member_insert on storage.objects;
drop policy if exists tour_media_member_update on storage.objects;

create or replace function public.storage_org_from_path(object_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  head text := split_part(object_name, '/', 1);
begin
  if head ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return head::uuid;
  end if;
  return null;
end $$;

grant execute on function public.storage_org_from_path(text) to authenticated;

create policy listing_media_member_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-media'
    and public.is_org_member(public.storage_org_from_path(name))
  );

create policy listing_media_member_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'listing-media'
    and public.is_org_member(public.storage_org_from_path(name))
  );

create policy listing_media_member_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-media'
    and public.is_org_member(public.storage_org_from_path(name))
  );

create policy tour_media_member_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tour-media'
    and public.is_org_member(public.storage_org_from_path(name))
  );

create policy tour_media_member_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'tour-media'
    and public.is_org_member(public.storage_org_from_path(name))
  );

drop policy if exists organizations_insert on organizations;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

grant usage on schema public to authenticated;
grant select on conversations, messages, notifications to authenticated;
