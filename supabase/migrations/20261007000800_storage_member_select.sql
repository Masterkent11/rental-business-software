drop policy if exists listing_media_member_select on storage.objects;
create policy listing_media_member_select on storage.objects
  for select to authenticated
  using (
    bucket_id in ('listing-media', 'tour-media')
    and app_private.is_org_member(app_private.storage_org_from_path(name))
  );
