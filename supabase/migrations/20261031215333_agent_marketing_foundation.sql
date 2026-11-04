create table public.marketing_media (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.agent_profiles(user_id),
 file_name text not null check (length(file_name) between 1 and 120),
 content_type text not null check (content_type in ('image/jpeg','video/mp4')),
 bytes bigint not null check (bytes between 1 and 12582912),
 storage_path text not null unique,
 state text not null default 'PENDING' check (state in ('PENDING','READY','FAILED','DELETING')),
 created_at timestamptz not null default now(),
 unique (id,user_id)
);
create index marketing_media_actor on public.marketing_media (user_id,created_at desc);
create table public.marketing_drafts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.agent_profiles(user_id),
 title text not null check (length(title) between 1 and 120),
 caption text not null default '' check (length(caption)<=2200),
 listing_id uuid references public.listings(id),
 source_photos text[] not null default '{}' check (cardinality(source_photos)<=10),
 state text not null default 'DRAFT' check (state in ('DRAFT','READY_FOR_REVIEW')),
 version integer not null default 1 check (version>0),
 updated_at timestamptz not null default now(),
 unique (id,user_id),
 check (listing_id is not null or cardinality(source_photos)=0)
);
create index marketing_drafts_actor on public.marketing_drafts (user_id,updated_at desc);
create table public.marketing_draft_media (
 draft_id uuid not null,
 media_id uuid not null,
 user_id uuid not null,
 position integer not null check (position between 0 and 9),
 primary key (draft_id,media_id),
 unique (draft_id,position),
 foreign key (draft_id,user_id) references public.marketing_drafts(id,user_id) on delete cascade,
 foreign key (media_id,user_id) references public.marketing_media(id,user_id)
);
create index marketing_draft_media_actor on public.marketing_draft_media(user_id,media_id);
alter table public.marketing_media enable row level security;
alter table public.marketing_drafts enable row level security;
alter table public.marketing_draft_media enable row level security;
create policy marketing_media_actor on public.marketing_media for all to rental_app
 using (user_id=nullif(current_setting('app.user_id',true),'')::uuid)
 with check (user_id=nullif(current_setting('app.user_id',true),'')::uuid and exists(select 1 from public.agent_profiles a where a.user_id=marketing_media.user_id and a.verification_state<>'SUSPENDED'));
create function app_private.marketing_property_allowed(target uuid, photos text[]) returns boolean
 language sql stable security invoker set search_path=public,pg_temp as $$
 select case when target is null then cardinality(photos)=0 else
 exists(select 1 from public.listing_representations r
 join public.agent_profiles a on a.id=r.agent_id
 join public.listings l on l.id=r.listing_id
 where a.user_id=nullif(current_setting('app.user_id',true),'')::uuid
 and a.verification_state='VERIFIED' and a.public_state='PUBLIC'
 and r.listing_id=target and r.state='ACTIVE' and r.can_edit_listing
 and (r.valid_from is null or r.valid_from<=now()) and (r.valid_until is null or r.valid_until>now())
 and l.state='PUBLISHED')
 and photos <@ array(select m.storage_url from public.media_assets m where m.listing_id=target and m.kind='PHOTO') end;
$$;
revoke all on function app_private.marketing_property_allowed(uuid,text[]) from public,anon,authenticated;
grant execute on function app_private.marketing_property_allowed(uuid,text[]) to rental_app;
create policy marketing_drafts_actor on public.marketing_drafts for all to rental_app
 using (user_id=nullif(current_setting('app.user_id',true),'')::uuid)
 with check (user_id=nullif(current_setting('app.user_id',true),'')::uuid
 and exists(select 1 from public.agent_profiles a where a.user_id=marketing_drafts.user_id and a.verification_state<>'SUSPENDED')
 and app_private.marketing_property_allowed(listing_id,source_photos));
create policy marketing_draft_media_actor on public.marketing_draft_media for all to rental_app
 using (user_id=nullif(current_setting('app.user_id',true),'')::uuid)
 with check (user_id=nullif(current_setting('app.user_id',true),'')::uuid);
revoke all on public.marketing_media,public.marketing_drafts,public.marketing_draft_media from public,anon,authenticated;
grant select,insert,update,delete on public.marketing_media,public.marketing_drafts,public.marketing_draft_media to rental_app;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('marketing-media','marketing-media',false,12582912,array['image/jpeg','video/mp4'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
