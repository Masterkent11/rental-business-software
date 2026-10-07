create schema if not exists app_private;

create or replace function app_private.current_app_user()
returns uuid
language sql
stable
set search_path = pg_temp
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$;

create or replace function app_private.current_app_organization()
returns uuid
language sql
stable
set search_path = pg_temp
as $$
  select nullif(current_setting('app.organization_id', true), '')::uuid;
$$;

create or replace function app_private.guest_can_see_resource(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.current_app_user() is not null and (
    exists (
      select 1 from public.occupancies o
       where o.resource_id = target
         and o.held_by = app_private.current_app_user()
    )
    or exists (
      select 1 from public.conversations c
        join public.listings l on l.id = c.listing_id
       where l.resource_id = target
         and c.customer_id = app_private.current_app_user()
    )
  );
$$;

create or replace function app_private.guest_can_see_listing(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.listings l
     where l.id = target
       and app_private.guest_can_see_resource(l.resource_id)
  );
$$;

create or replace function app_private.guest_can_see_property(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.rentable_resources r
     where r.property_id = target
       and app_private.guest_can_see_resource(r.id)
  );
$$;

create or replace function app_private.organization_has_customer(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.current_app_organization() is not null and (
    exists (
      select 1 from public.occupancies o
       where o.held_by = target
         and o.organization_id = app_private.current_app_organization()
    )
    or exists (
      select 1 from public.conversations c
       where c.customer_id = target
         and c.organization_id = app_private.current_app_organization()
    )
    or exists (
      select 1 from public.applications a
       where a.applicant_id = target
         and a.organization_id = app_private.current_app_organization()
    )
    or exists (
      select 1 from public.stays s
       where s.user_id = target
         and s.organization_id = app_private.current_app_organization()
    )
  );
$$;

revoke all on function app_private.current_app_user() from public, anon, authenticated;
revoke all on function app_private.current_app_organization() from public, anon, authenticated;
revoke all on function app_private.guest_can_see_resource(uuid) from public, anon, authenticated;
revoke all on function app_private.guest_can_see_listing(uuid) from public, anon, authenticated;
revoke all on function app_private.guest_can_see_property(uuid) from public, anon, authenticated;
revoke all on function app_private.organization_has_customer(uuid) from public, anon, authenticated;

grant usage on schema app_private to rental_app;
grant execute on function app_private.current_app_user() to rental_app;
grant execute on function app_private.current_app_organization() to rental_app;
grant execute on function app_private.guest_can_see_resource(uuid) to rental_app;
grant execute on function app_private.guest_can_see_listing(uuid) to rental_app;
grant execute on function app_private.guest_can_see_property(uuid) to rental_app;
grant execute on function app_private.organization_has_customer(uuid) to rental_app;

drop policy if exists own_occupancy on occupancies;
create policy own_occupancy on occupancies for select to rental_app using (
  held_by = app_private.current_app_user()
);

drop policy if exists participant_read on listings;
create policy participant_read on listings for select to rental_app using (
  app_private.guest_can_see_resource(resource_id)
);

drop policy if exists participant_read on rentable_resources;
create policy participant_read on rentable_resources for select to rental_app using (
  app_private.guest_can_see_resource(id)
);

drop policy if exists participant_read on properties;
create policy participant_read on properties for select to rental_app using (
  app_private.guest_can_see_property(id)
);

drop policy if exists participant_read on media_assets;
create policy participant_read on media_assets for select to rental_app using (
  listing_id is not null and app_private.guest_can_see_listing(listing_id)
);

drop policy if exists organization_customer_read on user_profiles;
create policy organization_customer_read on user_profiles for select to rental_app using (
  app_private.organization_has_customer(id)
);
