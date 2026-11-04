create function app_private.customer_organization_active(target uuid)
returns boolean language sql stable security invoker
set search_path = pg_catalog, pg_temp as $$
  select app_private.current_app_user() is not null
    and app_private.actor_active(app_private.current_app_user())
    and (app_private.current_app_organization() is null or target = app_private.current_app_organization())
    and exists (select 1 from public.organizations o where o.id = target and o.state <> 'SUSPENDED');
$$;

create function app_private.customer_application_owned(target uuid, organization uuid, resource uuid default null)
returns boolean language sql stable security invoker
set search_path = pg_catalog, pg_temp as $$
  select app_private.customer_organization_active(organization)
    and exists (
      select 1 from public.applications a
      where a.id = target and a.organization_id = organization
        and a.applicant_id = app_private.current_app_user()
        and (resource is null or a.resource_id = resource)
    );
$$;

revoke all on function app_private.customer_organization_active(uuid) from public, anon, authenticated;
revoke all on function app_private.customer_application_owned(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function app_private.customer_organization_active(uuid) to rental_app;
grant execute on function app_private.customer_application_owned(uuid, uuid, uuid) to rental_app;

drop policy partner_organization_lifecycle on public.applications;
create policy partner_organization_lifecycle on public.applications
as restrictive for select to rental_app
using (app_private.app_organization_allowed(organization_id) or (applicant_id = app_private.current_app_user() and app_private.customer_organization_active(organization_id)));
create policy partner_organization_write_lifecycle on public.applications
as restrictive for insert to rental_app
with check (app_private.app_organization_allowed(organization_id) or (applicant_id = app_private.current_app_user() and app_private.customer_organization_active(organization_id) and state = 'SUBMITTED' and decided_by is null and decided_at is null
  and exists (select 1 from public.listings l where l.resource_id = applications.resource_id
    and l.organization_id = applications.organization_id and l.state = 'PUBLISHED'
    and l.kind = 'LONG_TERM' and l.intent = 'RENT')));
create policy partner_organization_update_lifecycle on public.applications
as restrictive for update to rental_app
using (app_private.app_organization_allowed(organization_id) or (applicant_id = app_private.current_app_user() and app_private.customer_organization_active(organization_id) and state in ('SUBMITTED', 'UNDER_REVIEW')))
with check (app_private.app_organization_allowed(organization_id) or (applicant_id = app_private.current_app_user() and app_private.customer_organization_active(organization_id) and state = 'WITHDRAWN' and decided_by is null and decided_at is null));
create policy partner_organization_delete_lifecycle on public.applications
as restrictive for delete to rental_app using (app_private.app_organization_allowed(organization_id));

drop policy partner_organization_lifecycle on public.application_documents;
create policy partner_organization_lifecycle on public.application_documents
as restrictive for select to rental_app
using (app_private.app_organization_allowed(organization_id) or (app_private.customer_application_owned(application_id, organization_id)));
create policy partner_organization_write_lifecycle on public.application_documents
as restrictive for insert to rental_app
with check (app_private.app_organization_allowed(organization_id) or (app_private.customer_application_owned(application_id, organization_id) and exists (
  select 1 from public.applications a where a.id = application_id and a.state in ('SUBMITTED', 'UNDER_REVIEW'))));
create policy partner_organization_update_lifecycle on public.application_documents
as restrictive for update to rental_app
using (app_private.app_organization_allowed(organization_id))
with check (app_private.app_organization_allowed(organization_id));
create policy partner_organization_delete_lifecycle on public.application_documents
as restrictive for delete to rental_app using (app_private.app_organization_allowed(organization_id));

drop policy partner_organization_lifecycle on public.reservations;
create policy partner_organization_lifecycle on public.reservations
as restrictive for select to rental_app
using (app_private.app_organization_allowed(organization_id) or (app_private.customer_application_owned(application_id, organization_id)));
create policy partner_organization_write_lifecycle on public.reservations
as restrictive for insert to rental_app
with check (app_private.app_organization_allowed(organization_id) or (app_private.customer_application_owned(application_id, organization_id) and state = 'PENDING_PAYMENT' and payment_id is null
  and exists (select 1 from public.applications a join public.listings l
    on l.resource_id = a.resource_id and l.organization_id = a.organization_id
    join public.occupancies o on o.id = reservations.occupancy_id
    where a.id = reservations.application_id and a.state in ('SUBMITTED', 'UNDER_REVIEW')
      and l.kind = 'LONG_TERM' and l.intent = 'RENT' and l.state = 'PUBLISHED'
      and l.reservation_fee_centavos = reservations.fee_centavos
      and o.application_id = a.id and o.organization_id = a.organization_id
      and o.resource_id = a.resource_id and o.held_by = app_private.current_app_user()
      and o.kind = 'RESERVATION' and o.state = 'HELD')));
create policy partner_organization_update_lifecycle on public.reservations
as restrictive for update to rental_app
using (app_private.app_organization_allowed(organization_id) or (app_private.customer_application_owned(application_id, organization_id)))
with check (app_private.app_organization_allowed(organization_id) or (app_private.customer_application_owned(application_id, organization_id) and state in ('EXPIRED', 'FORFEITED') and exists (
  select 1 from public.applications a where a.id = application_id and a.state = 'WITHDRAWN')));
create policy partner_organization_delete_lifecycle on public.reservations
as restrictive for delete to rental_app using (app_private.app_organization_allowed(organization_id));

drop policy partner_organization_lifecycle on public.occupancies;
create policy partner_organization_lifecycle on public.occupancies
as restrictive for select to rental_app
using (app_private.app_organization_allowed(organization_id) or (held_by = app_private.current_app_user() and app_private.customer_application_owned(application_id, organization_id, resource_id)));
create policy partner_organization_write_lifecycle on public.occupancies
as restrictive for insert to rental_app
with check (app_private.app_organization_allowed(organization_id) or (held_by = app_private.current_app_user() and app_private.customer_application_owned(application_id, organization_id, resource_id) and kind = 'RESERVATION' and state = 'HELD'
  and exists (select 1 from public.applications a where a.id = application_id and a.state in ('SUBMITTED', 'UNDER_REVIEW'))));
create policy partner_organization_update_lifecycle on public.occupancies
as restrictive for update to rental_app
using (app_private.app_organization_allowed(organization_id) or (held_by = app_private.current_app_user() and app_private.customer_application_owned(application_id, organization_id, resource_id)))
with check (app_private.app_organization_allowed(organization_id) or (held_by = app_private.current_app_user() and app_private.customer_application_owned(application_id, organization_id, resource_id) and state = 'RELEASED' and exists (
  select 1 from public.applications a where a.id = application_id and a.state = 'WITHDRAWN')));
create policy partner_organization_delete_lifecycle on public.occupancies
as restrictive for delete to rental_app using (app_private.app_organization_allowed(organization_id));

drop policy partner_organization_lifecycle on public.ledger_entries;
create policy partner_organization_lifecycle on public.ledger_entries
as restrictive for select to rental_app
using (app_private.app_organization_allowed(organization_id));
create policy partner_organization_write_lifecycle on public.ledger_entries
as restrictive for insert to rental_app
with check (app_private.app_organization_allowed(organization_id) or (app_private.customer_organization_active(organization_id)
  and cause_type = 'RESERVATION' and entry_type = 'RESERVATION_FEE_FORFEITED'
  and origin = 'ONLINE' and actor_type = 'SYSTEM' and actor_id = 'reservation-outcome'
  and corrects_id is null and exists (
    select 1 from public.reservations r join public.applications a on a.id = r.application_id
    where r.id = ledger_entries.cause_id and r.organization_id = ledger_entries.organization_id
      and a.organization_id = r.organization_id and a.applicant_id = app_private.current_app_user()
      and a.state = 'WITHDRAWN' and r.state = 'FORFEITED'
      and r.fee_centavos = ledger_entries.amount_centavos)));
create policy partner_organization_update_lifecycle on public.ledger_entries
as restrictive for update to rental_app
using (app_private.app_organization_allowed(organization_id))
with check (app_private.app_organization_allowed(organization_id));
create policy partner_organization_delete_lifecycle on public.ledger_entries
as restrictive for delete to rental_app using (app_private.app_organization_allowed(organization_id));

drop policy partner_organization_lifecycle on public.notifications;
create policy partner_organization_lifecycle on public.notifications
as restrictive for select to rental_app
using (app_private.app_organization_allowed(organization_id) or (user_id = app_private.current_app_user() and organization_id is null and app_private.actor_active(app_private.current_app_user())));
create policy partner_organization_write_lifecycle on public.notifications
as restrictive for insert to rental_app
with check (app_private.app_organization_allowed(organization_id) or (user_id = app_private.current_app_user() and organization_id is null and app_private.actor_active(app_private.current_app_user()) or (
  user_id is null and app_private.customer_organization_active(organization_id)
  and kind = 'APPLICATION_RECEIVED' and title = 'New rental application'
  and body = 'A customer submitted an application.' and exists (
    select 1 from public.applications a where a.organization_id = notifications.organization_id
      and a.applicant_id = app_private.current_app_user() and a.state = 'SUBMITTED'
      and notifications.link = '/applications/' || a.id::text))));
create policy partner_organization_update_lifecycle on public.notifications
as restrictive for update to rental_app
using (app_private.app_organization_allowed(organization_id) or (user_id = app_private.current_app_user() and organization_id is null and app_private.actor_active(app_private.current_app_user())))
with check (app_private.app_organization_allowed(organization_id) or (user_id = app_private.current_app_user() and organization_id is null and app_private.actor_active(app_private.current_app_user())));
create policy partner_organization_delete_lifecycle on public.notifications
as restrictive for delete to rental_app using (app_private.app_organization_allowed(organization_id));

drop policy partner_organization_lifecycle on public.rentable_resources;
create policy partner_organization_lifecycle on public.rentable_resources
as restrictive for select to rental_app using (
  app_private.app_organization_allowed(organization_id)
  or app_private.agent_represents_resource(id)
  or (app_private.customer_organization_active(organization_id) and exists (
    select 1 from public.applications a where a.resource_id = rentable_resources.id
      and a.organization_id = rentable_resources.organization_id
      and a.applicant_id = app_private.current_app_user()))
);

do $$
declare target text;
begin
  foreach target in array array['applications', 'application_documents', 'reservations', 'occupancies', 'ledger_entries', 'notifications', 'rentable_resources'] loop
    execute format('create policy customer_organization_lifecycle on public.%I as restrictive for all to rental_app using (app_private.current_app_user() is null or organization_id is null or app_private.customer_organization_active(organization_id)) with check (app_private.current_app_user() is null or organization_id is null or app_private.customer_organization_active(organization_id))', target);
  end loop;
end $$;

create function app_private.guard_customer_application_update()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, pg_temp as $$
declare mutable_columns text[];
begin
  if app_private.app_organization_allowed(old.organization_id) then return new; end if;
  mutable_columns := case tg_table_name
    when 'applications' then array['state']
    when 'reservations' then array['state', 'resolved_at']
    when 'occupancies' then array['state']
  end;
  if (to_jsonb(new) - mutable_columns) is distinct from (to_jsonb(old) - mutable_columns) then
    raise exception 'Customer application relationships and financial terms are immutable' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function app_private.guard_customer_application_update() from public, anon, authenticated, rental_app;
create trigger customer_application_update before update on public.applications
for each row execute function app_private.guard_customer_application_update();
create trigger customer_application_update before update on public.reservations
for each row execute function app_private.guard_customer_application_update();
create trigger customer_application_update before update on public.occupancies
for each row execute function app_private.guard_customer_application_update();
