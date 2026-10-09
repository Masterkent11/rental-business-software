create extension if not exists pg_trgm with schema extensions;

alter table listings add column if not exists furnishing text;
alter table listings drop constraint if exists listings_furnishing_check;
alter table listings add constraint listings_furnishing_check check (
  furnishing is null or furnishing in ('FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED')
);

alter table listings add column if not exists pets_allowed boolean;

create index if not exists listings_published_recent
  on listings (published_at desc nulls last) where state = 'PUBLISHED';

create index if not exists listings_published_furnishing
  on listings (intent, furnishing) where state = 'PUBLISHED' and furnishing is not null;

create index if not exists listings_published_pets
  on listings (intent) where state = 'PUBLISHED' and pets_allowed;

create index if not exists listings_title_trgm
  on listings using gin (title extensions.gin_trgm_ops);

create index if not exists properties_name_trgm
  on properties using gin (name extensions.gin_trgm_ops);

create index if not exists properties_area_trgm
  on properties using gin (area_label extensions.gin_trgm_ops);

create index if not exists properties_city_trgm
  on properties using gin (city_label extensions.gin_trgm_ops);

create table if not exists listing_view_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references user_profiles(id) on delete cascade,
  listing_id  uuid not null references listings(id) on delete cascade,
  viewed_at   timestamptz not null default now()
);

create index if not exists listing_view_events_user on listing_view_events (user_id, viewed_at desc);
create index if not exists listing_view_events_listing on listing_view_events (listing_id, viewed_at desc);

alter table listing_view_events enable row level security;

drop policy if exists own_listing_views on listing_view_events;
create policy own_listing_views on listing_view_events to rental_app
  using (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

revoke all on listing_view_events from public, anon, authenticated;
grant select, insert on listing_view_events to rental_app;
