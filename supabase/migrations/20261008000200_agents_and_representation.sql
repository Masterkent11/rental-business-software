alter table user_capabilities drop constraint if exists user_capabilities_capability_check;
alter table user_capabilities add constraint user_capabilities_capability_check check (
  capability in ('CUSTOMER', 'TENANT', 'GUEST', 'OWNER', 'STAFF', 'PLATFORM_ADMIN', 'AGENT')
);

create table if not exists agent_profiles (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null unique references user_profiles(id) on delete cascade,
  display_name        text not null,
  headline            text not null default 'Real estate agent',
  bio                 text not null default '',
  photo_url           text,
  license_number      text,
  license_authority   text,
  verification_state  text not null default 'UNVERIFIED',
  verified_at         timestamptz,
  verified_by         uuid references user_profiles(id),
  verification_note   text,
  specialties         text[] not null default '{}',
  areas_served        text[] not null default '{}',
  languages           text[] not null default '{}',
  public_state        text not null default 'PUBLIC',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint agent_profiles_name_length check (char_length(btrim(display_name)) between 2 and 80),
  constraint agent_profiles_headline_length check (char_length(headline) <= 80),
  constraint agent_profiles_bio_length check (char_length(bio) <= 2000),
  constraint agent_profiles_license_length check (license_number is null or char_length(license_number) between 3 and 40),
  constraint agent_profiles_verification_state_check check (
    verification_state in ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED')
  ),
  constraint agent_profiles_public_state_check check (public_state in ('PUBLIC', 'HIDDEN')),
  constraint agent_profiles_verified_has_record check (
    verification_state <> 'VERIFIED' or (verified_at is not null)
  ),
  constraint agent_profiles_list_sizes check (
    cardinality(specialties) <= 12 and cardinality(areas_served) <= 20 and cardinality(languages) <= 10
  )
);

create index if not exists agent_profiles_public on agent_profiles (verification_state) where public_state = 'PUBLIC';

create or replace function app_private.guard_agent_verification()
returns trigger
language plpgsql
set search_path = pg_temp
as $$
declare
  actor text := coalesce(current_setting('app.verification_actor', true), '');
begin
  if tg_op = 'INSERT' then
    if new.verification_state not in ('UNVERIFIED', 'PENDING') and actor = '' then
      raise exception 'Agent verification can only be granted by the platform' using errcode = '42501';
    end if;
    if actor = '' and (new.verified_at is not null or new.verified_by is not null) then
      raise exception 'Agent verification can only be granted by the platform' using errcode = '42501';
    end if;
    return new;
  end if;

  if actor = '' and (
       new.verified_at is distinct from old.verified_at
    or new.verified_by is distinct from old.verified_by
    or new.verification_note is distinct from old.verification_note
    or (new.verification_state is distinct from old.verification_state
        and not (old.verification_state in ('UNVERIFIED', 'REJECTED') and new.verification_state = 'PENDING'))
  ) then
    raise exception 'Agent verification can only be changed by the platform' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists agent_profiles_verification_guard on agent_profiles;
create trigger agent_profiles_verification_guard
  before insert or update on agent_profiles
  for each row execute function app_private.guard_agent_verification();

create or replace function app_private.current_app_agent()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.id from public.agent_profiles a
   where a.user_id = nullif(current_setting('app.user_id', true), '')::uuid;
$$;

create or replace function app_private.current_auth_agent()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.id from public.agent_profiles a where a.user_id = auth.uid();
$$;

create or replace function app_private.current_app_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_capabilities c
     where c.user_id = nullif(current_setting('app.user_id', true), '')::uuid
       and c.capability = 'PLATFORM_ADMIN'
       and c.revoked_at is null
  );
$$;

alter table agent_profiles enable row level security;

drop policy if exists agent_public_read on agent_profiles;
create policy agent_public_read on agent_profiles for select using (public_state = 'PUBLIC');

drop policy if exists own_agent_profile on agent_profiles;
create policy own_agent_profile on agent_profiles using (
  user_id = nullif(current_setting('app.user_id', true), '')::uuid
);

drop policy if exists platform_admin_read on agent_profiles;
create policy platform_admin_read on agent_profiles for select to rental_app using (
  app_private.current_app_is_platform_admin()
);

drop policy if exists platform_admin_manage on agent_profiles;
create policy platform_admin_manage on agent_profiles for update to rental_app using (
  app_private.current_app_is_platform_admin()
);

create table if not exists listing_representations (
  id                   uuid primary key default uuid_generate_v4(),
  organization_id      uuid not null references organizations(id),
  listing_id           uuid not null references listings(id) on delete cascade,
  agent_id             uuid not null references agent_profiles(id),
  state                text not null default 'PENDING',
  can_edit_listing     boolean not null default false,
  can_manage_tour      boolean not null default true,
  can_view_commercial  boolean not null default true,
  invited_by           uuid references user_profiles(id),
  invited_at           timestamptz not null default now(),
  responded_at         timestamptz,
  ended_at             timestamptz,
  ended_by             uuid references user_profiles(id),
  end_reason           text,
  constraint listing_representations_state_check check (state in ('PENDING', 'ACTIVE', 'ENDED')),
  constraint listing_representations_ended_has_time check ((state = 'ENDED') = (ended_at is not null)),
  constraint listing_representations_active_responded check (state <> 'ACTIVE' or responded_at is not null),
  unique (id, organization_id)
);

create unique index if not exists listing_representations_current
  on listing_representations (listing_id) where state in ('PENDING', 'ACTIVE');
create index if not exists listing_representations_agent on listing_representations (agent_id, state);
create index if not exists listing_representations_org on listing_representations (organization_id, state);

alter table listing_representations enable row level security;

drop policy if exists org_isolation on listing_representations;
create policy org_isolation on listing_representations using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);

drop policy if exists representation_public_read on listing_representations;
create policy representation_public_read on listing_representations for select to rental_app using (
  state = 'ACTIVE'
  and exists (select 1 from listings l where l.id = listing_representations.listing_id and l.state = 'PUBLISHED')
);

drop policy if exists agent_own_representation on listing_representations;
create policy agent_own_representation on listing_representations to rental_app using (
  agent_id = app_private.current_app_agent()
);

create or replace function app_private.agent_represents_listing(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.listing_representations r
     where r.listing_id = target
       and r.state = 'ACTIVE'
       and r.agent_id = app_private.current_app_agent()
  );
$$;

create or replace function app_private.agent_represents_resource(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.listing_representations r
      join public.listings l on l.id = r.listing_id
     where l.resource_id = target
       and r.state in ('PENDING', 'ACTIVE')
       and r.agent_id = app_private.current_app_agent()
  );
$$;

create or replace function app_private.agent_represents_property(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.listing_representations r
      join public.listings l on l.id = r.listing_id
      join public.rentable_resources rr on rr.id = l.resource_id
     where rr.property_id = target
       and r.state in ('PENDING', 'ACTIVE')
       and r.agent_id = app_private.current_app_agent()
  );
$$;

create or replace function app_private.agent_may_view_commercial(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.listing_representations r
     where r.listing_id = target
       and r.state = 'ACTIVE'
       and r.can_view_commercial
       and r.agent_id = app_private.current_app_agent()
  );
$$;

create or replace function app_private.agent_invited_to_listing(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.listing_representations r
     where r.listing_id = target
       and r.state in ('PENDING', 'ACTIVE')
       and r.agent_id = app_private.current_app_agent()
  );
$$;

drop policy if exists agent_represented_read on listings;
create policy agent_represented_read on listings for select to rental_app using (
  app_private.agent_invited_to_listing(id)
);

drop policy if exists agent_represented_read on rentable_resources;
create policy agent_represented_read on rentable_resources for select to rental_app using (
  app_private.agent_represents_resource(id)
);

drop policy if exists agent_represented_read on properties;
create policy agent_represented_read on properties for select to rental_app using (
  app_private.agent_represents_property(id)
);

drop policy if exists agent_represented_read on media_assets;
create policy agent_represented_read on media_assets for select to rental_app using (
  listing_id is not null and app_private.agent_represents_listing(listing_id)
);

drop policy if exists agent_represented_read on virtual_tours;
create policy agent_represented_read on virtual_tours for select to rental_app using (
  app_private.agent_represents_resource(resource_id)
);

drop policy if exists agent_commercial_read on listing_sale_terms;
create policy agent_commercial_read on listing_sale_terms for select to rental_app using (
  app_private.agent_may_view_commercial(listing_id)
);

revoke all on function app_private.guard_agent_verification() from public, anon, authenticated;
revoke all on function app_private.current_app_agent() from public, anon, authenticated;
revoke all on function app_private.current_auth_agent() from public, anon;
revoke all on function app_private.current_app_is_platform_admin() from public, anon, authenticated;
revoke all on function app_private.agent_represents_listing(uuid) from public, anon, authenticated;
revoke all on function app_private.agent_represents_resource(uuid) from public, anon, authenticated;
revoke all on function app_private.agent_represents_property(uuid) from public, anon, authenticated;
revoke all on function app_private.agent_may_view_commercial(uuid) from public, anon, authenticated;
revoke all on function app_private.agent_invited_to_listing(uuid) from public, anon, authenticated;

grant execute on function app_private.current_app_agent() to rental_app;
grant execute on function app_private.current_auth_agent() to authenticated;
grant execute on function app_private.current_app_is_platform_admin() to rental_app;
grant execute on function app_private.agent_represents_listing(uuid) to rental_app;
grant execute on function app_private.agent_represents_resource(uuid) to rental_app;
grant execute on function app_private.agent_represents_property(uuid) to rental_app;
grant execute on function app_private.agent_may_view_commercial(uuid) to rental_app;
grant execute on function app_private.agent_invited_to_listing(uuid) to rental_app;

revoke all on agent_profiles from public, anon, authenticated;
revoke all on listing_representations from public, anon, authenticated;
grant select, insert, update on agent_profiles to rental_app;
grant select, insert, update on listing_representations to rental_app;
