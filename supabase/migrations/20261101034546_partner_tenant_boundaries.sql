create or replace function app_private.actor_active(actor uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp as $$
 select exists(select 1 from public.user_profiles u where u.id=actor and u.deactivated_at is null);
$$;
create or replace function app_private.agent_eligible(actor uuid)
returns uuid language sql stable security definer set search_path = pg_catalog, pg_temp as $$
 select a.id from public.agent_profiles a
 where a.user_id=actor and a.verification_state<>'SUSPENDED'
 and (a.verification_state='VERIFIED' or not exists(select 1 from public.organization_members m where m.user_id=actor))
 and app_private.actor_active(actor)
 and exists(select 1 from public.user_capabilities c where c.user_id=actor and c.capability='AGENT' and c.revoked_at is null);
$$;
create or replace function app_private.owner_member(actor uuid, target uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp as $$
 select app_private.actor_active(actor) and exists(
 select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id
 join public.user_capabilities c on c.user_id=m.user_id and c.organization_id=m.organization_id and c.capability=m.role and c.revoked_at is null
 where m.user_id=actor and m.organization_id=target and m.revoked_at is null and o.state<>'SUSPENDED');
$$;
create or replace function app_private.current_app_agent()
returns uuid language sql stable security definer set search_path = pg_catalog, pg_temp as $$
 select app_private.agent_eligible(nullif(current_setting('app.user_id',true),'')::uuid);
$$;
create or replace function app_private.current_auth_agent()
returns uuid language sql stable security definer set search_path = pg_catalog, pg_temp as $$
 select app_private.agent_eligible(auth.uid());
$$;
create or replace function app_private.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp as $$
 select app_private.owner_member(auth.uid(),org);
$$;
create or replace function app_private.representation_current(target public.listing_representations)
returns boolean language sql stable security invoker set search_path = pg_catalog, pg_temp as $$
 select target.state='ACTIVE' and (target.valid_from is null or target.valid_from<=now()) and (target.valid_until is null or target.valid_until>now());
$$;
create or replace function app_private.agent_represents_listing(target uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp as $$
 select exists(select 1 from public.listing_representations r join public.organizations o on o.id=r.organization_id
 where r.listing_id=target and r.agent_id=app_private.current_app_agent() and exists(select 1 from public.agent_profiles a where a.id=r.agent_id and a.verification_state='VERIFIED') and o.state<>'SUSPENDED' and app_private.representation_current(r));
$$;
create or replace function app_private.agent_represents_resource(target uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp as $$
 select exists(select 1 from public.listings l where l.resource_id=target and app_private.agent_represents_listing(l.id));
$$;
create or replace function app_private.agent_represents_property(target uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp as $$
 select exists(select 1 from public.rentable_resources r where r.property_id=target and app_private.agent_represents_resource(r.id));
$$;
create or replace function app_private.agent_may_view_commercial(target uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp as $$
 select app_private.agent_represents_listing(target) and exists(select 1 from public.listing_representations r where r.listing_id=target and r.agent_id=app_private.current_app_agent() and r.can_view_commercial and app_private.representation_current(r));
$$;
create or replace function app_private.agent_invited_to_listing(target uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp as $$
 select exists(select 1 from public.listing_representations r join public.organizations o on o.id=r.organization_id where r.listing_id=target and r.agent_id=app_private.current_app_agent() and exists(select 1 from public.agent_profiles a where a.id=r.agent_id and a.verification_state='VERIFIED') and o.state<>'SUSPENDED' and (r.state='PENDING' or app_private.representation_current(r)));
$$;
create or replace view app_private.partner_memberships with (security_invoker=true) as
 select o.id as tenant_id,'OWNER'::text as kind,m.user_id,o.trading_name as display_name,m.role,(o.state='VERIFIED') as verified
 from public.organization_members m join public.organizations o on o.id=m.organization_id
 where m.user_id=app_private.current_app_user() and app_private.owner_member(m.user_id,o.id)
 union all
 select a.id,'AGENT',a.user_id,a.display_name,'AGENT',(a.verification_state='VERIFIED')
 from public.agent_profiles a where a.user_id=app_private.current_app_user() and a.id=app_private.current_app_agent();
create or replace view app_private.partner_tenants with (security_invoker=true) as
 select distinct tenant_id,kind,display_name,verified from app_private.partner_memberships;
revoke all on app_private.partner_memberships,app_private.partner_tenants from public,anon,authenticated;
grant select on app_private.partner_memberships,app_private.partner_tenants to rental_app;
create or replace function app_private.guard_partner_enrollment()
returns trigger language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare actor uuid;
begin
 actor:=new.user_id;
 if session_user<>'rental_app' and coalesce(current_setting('role',true),'')<>'rental_app' then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,103));
 if not app_private.actor_active(actor) then raise exception 'Account is unavailable' using errcode='42501'; end if;
 if tg_table_name='agent_profiles' and exists(select 1 from public.organization_members m where m.user_id=actor) then
 raise exception 'An additional partner role requires explicit platform provisioning' using errcode='42501';
 end if;
 if tg_table_name='organization_members' and exists(select 1 from public.agent_profiles a where a.user_id=actor) then
 raise exception 'An additional partner role requires explicit platform provisioning' using errcode='42501';
 end if;
 return new;
end $$;
create trigger agent_partner_enrollment before insert on public.agent_profiles for each row execute function app_private.guard_partner_enrollment();
create trigger owner_partner_enrollment before insert on public.organization_members for each row execute function app_private.guard_partner_enrollment();
create or replace function app_private.app_organization_allowed(target uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp as $$
 select case when nullif(current_setting('app.organization_id',true),'') is null then true else
 target=nullif(current_setting('app.organization_id',true),'')::uuid
 and exists(select 1 from public.organizations o where o.id=target and o.state<>'SUSPENDED')
 and (app_private.current_app_user() is null or app_private.owner_member(app_private.current_app_user(),target)) end;
$$;
do $$ declare t text; begin
 for t in select table_name from information_schema.columns where table_schema='public' and column_name='organization_id' and table_name not in ('organization_members','user_capabilities','listing_representations','listing_change_proposals') loop
 execute format('create policy partner_organization_lifecycle on public.%I as restrictive for all to rental_app using (app_private.app_organization_allowed(organization_id)) with check (app_private.app_organization_allowed(organization_id))',t);
 end loop;
 for t in select tablename from pg_tables where schemaname='public' and tablename not in ('user_profiles','organization_members','user_capabilities','organizations','provider_events','payment_notification_outbox') loop
 execute format('create policy partner_actor_lifecycle on public.%I as restrictive for all to rental_app using (app_private.current_app_user() is null or app_private.actor_active(app_private.current_app_user())) with check (app_private.current_app_user() is null or app_private.actor_active(app_private.current_app_user()))',t);
 end loop;
end $$;
create unique index if not exists listings_tenant_identity on public.listings(id,organization_id);
alter table public.rentable_resources add constraint resource_parent_tenant foreign key(parent_id,organization_id) references public.rentable_resources(id,organization_id);
alter table public.listing_representations add constraint listing_representations_listing_tenant foreign key(listing_id,organization_id) references public.listings(id,organization_id);
alter table public.conversations add constraint conversations_listing_tenant foreign key(listing_id,organization_id) references public.listings(id,organization_id);
alter table public.inquiries add constraint inquiries_listing_tenant foreign key(listing_id,organization_id) references public.listings(id,organization_id);
alter table public.viewings add constraint viewings_listing_tenant foreign key(listing_id,organization_id) references public.listings(id,organization_id);
alter table public.media_assets add constraint media_assets_listing_tenant foreign key(listing_id,organization_id) references public.listings(id,organization_id);
alter table public.listing_sale_terms add constraint listing_sale_terms_listing_tenant foreign key(listing_id,organization_id) references public.listings(id,organization_id);
revoke all on function app_private.actor_active(uuid) from public,anon,authenticated;
grant execute on function app_private.actor_active(uuid) to rental_app;
revoke all on function app_private.agent_eligible(uuid) from public,anon,authenticated;
grant execute on function app_private.agent_eligible(uuid) to rental_app;
revoke all on function app_private.owner_member(uuid,uuid) from public,anon,authenticated;
grant execute on function app_private.owner_member(uuid,uuid) to rental_app;
revoke all on function app_private.representation_current(public.listing_representations) from public,anon,authenticated;
grant execute on function app_private.representation_current(public.listing_representations) to rental_app;
revoke all on function app_private.app_organization_allowed(uuid) from public,anon,authenticated;
grant execute on function app_private.app_organization_allowed(uuid) to rental_app;
revoke all on function app_private.guard_partner_enrollment() from public,anon,authenticated,rental_app;
create policy agent_private_lifecycle on public.marketing_media as restrictive for all to rental_app using (app_private.current_app_agent() is not null) with check (app_private.current_app_agent() is not null);
create policy agent_private_lifecycle on public.marketing_drafts as restrictive for all to rental_app using (app_private.current_app_agent() is not null) with check (app_private.current_app_agent() is not null);
create policy agent_private_lifecycle on public.marketing_draft_media as restrictive for all to rental_app using (app_private.current_app_agent() is not null) with check (app_private.current_app_agent() is not null);
create or replace function app_private.auth_agent_listing(target uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,pg_temp as $$
 select exists(select 1 from public.listing_representations r join public.organizations o on o.id=r.organization_id where r.listing_id=target and r.agent_id=app_private.current_auth_agent() and exists(select 1 from public.agent_profiles a where a.id=r.agent_id and a.verification_state='VERIFIED') and o.state<>'SUSPENDED' and app_private.representation_current(r));
$$;
revoke all on function app_private.auth_agent_listing(uuid) from public,anon;
grant execute on function app_private.auth_agent_listing(uuid) to authenticated;
create function app_private.auth_actor_active() returns boolean language sql stable security definer set search_path=pg_catalog,pg_temp as $$ select app_private.actor_active(auth.uid()); $$;
revoke all on function app_private.auth_actor_active() from public,anon;
grant execute on function app_private.auth_actor_active() to authenticated;

drop policy if exists agent_conversation on public.conversations;
create policy agent_conversation on public.conversations to rental_app using (agent_id=app_private.current_app_agent() and app_private.agent_represents_listing(listing_id));
drop policy if exists participant_realtime_read on public.conversations;
create policy participant_realtime_read on public.conversations for select to authenticated using (app_private.auth_actor_active() and (customer_id=auth.uid() or app_private.is_org_member(organization_id) or (agent_id=app_private.current_auth_agent() and app_private.auth_agent_listing(listing_id))));
drop policy if exists agent_inquiry on public.inquiries;
create policy agent_inquiry on public.inquiries to rental_app using (agent_id=app_private.current_app_agent() and app_private.agent_represents_listing(listing_id));
drop policy if exists participant_realtime_read on public.inquiries;
create policy participant_realtime_read on public.inquiries for select to authenticated using (app_private.auth_actor_active() and (customer_id=auth.uid() or app_private.is_org_member(organization_id) or (agent_id=app_private.current_auth_agent() and app_private.auth_agent_listing(listing_id))));
drop policy if exists agent_viewing on public.viewings;
create policy agent_viewing on public.viewings to rental_app using (agent_id=app_private.current_app_agent() and app_private.agent_represents_listing(listing_id));
drop policy if exists participant_realtime_read on public.viewings;
create policy participant_realtime_read on public.viewings for select to authenticated using (app_private.auth_actor_active() and (customer_id=auth.uid() or app_private.is_org_member(organization_id) or (agent_id=app_private.current_auth_agent() and app_private.auth_agent_listing(listing_id))));
drop policy if exists participant_realtime_read on public.messages;
create policy participant_realtime_read on public.messages for select to authenticated using (
 app_private.auth_actor_active() and exists(select 1 from public.conversations c where c.id=messages.conversation_id));
drop policy if exists audience_realtime_read on public.notifications;
create policy audience_realtime_read on public.notifications for select to authenticated using (
 app_private.auth_actor_active() and (user_id=auth.uid() or (user_id is null and app_private.is_org_member(organization_id))));
create policy partner_organization_lifecycle on public.listing_representations as restrictive for all to rental_app using (app_private.app_organization_allowed(organization_id) or agent_id=app_private.current_app_agent()) with check (app_private.app_organization_allowed(organization_id) or agent_id=app_private.current_app_agent());
create policy partner_organization_lifecycle on public.listing_change_proposals as restrictive for all to rental_app using (app_private.app_organization_allowed(organization_id) or proposed_by_agent=app_private.current_app_agent()) with check (app_private.app_organization_allowed(organization_id) or proposed_by_agent=app_private.current_app_agent());
drop policy partner_organization_lifecycle on public.listings;
create policy partner_organization_lifecycle on public.listings as restrictive for select to rental_app using (app_private.app_organization_allowed(organization_id) or state='PUBLISHED' or app_private.agent_represents_listing(id));
create policy partner_organization_write_lifecycle on public.listings as restrictive for insert to rental_app with check (app_private.app_organization_allowed(organization_id));
create policy partner_organization_update_lifecycle on public.listings as restrictive for update to rental_app using (app_private.app_organization_allowed(organization_id)) with check (app_private.app_organization_allowed(organization_id));
create policy partner_organization_delete_lifecycle on public.listings as restrictive for delete to rental_app using (app_private.app_organization_allowed(organization_id));
drop policy partner_organization_lifecycle on public.rentable_resources;
create policy partner_organization_lifecycle on public.rentable_resources as restrictive for select to rental_app using (app_private.app_organization_allowed(organization_id) or app_private.agent_represents_resource(id));
create policy partner_organization_write_lifecycle on public.rentable_resources as restrictive for insert to rental_app with check (app_private.app_organization_allowed(organization_id));
create policy partner_organization_update_lifecycle on public.rentable_resources as restrictive for update to rental_app using (app_private.app_organization_allowed(organization_id)) with check (app_private.app_organization_allowed(organization_id));
create policy partner_organization_delete_lifecycle on public.rentable_resources as restrictive for delete to rental_app using (app_private.app_organization_allowed(organization_id));
drop policy partner_organization_lifecycle on public.properties;
create policy partner_organization_lifecycle on public.properties as restrictive for select to rental_app using (app_private.app_organization_allowed(organization_id) or app_private.agent_represents_property(id));
create policy partner_organization_write_lifecycle on public.properties as restrictive for insert to rental_app with check (app_private.app_organization_allowed(organization_id));
create policy partner_organization_update_lifecycle on public.properties as restrictive for update to rental_app using (app_private.app_organization_allowed(organization_id)) with check (app_private.app_organization_allowed(organization_id));
create policy partner_organization_delete_lifecycle on public.properties as restrictive for delete to rental_app using (app_private.app_organization_allowed(organization_id));
drop policy partner_organization_lifecycle on public.media_assets;
create policy partner_organization_lifecycle on public.media_assets as restrictive for select to rental_app using (app_private.app_organization_allowed(organization_id) or app_private.agent_represents_listing(listing_id));
create policy partner_organization_write_lifecycle on public.media_assets as restrictive for insert to rental_app with check (app_private.app_organization_allowed(organization_id));
create policy partner_organization_update_lifecycle on public.media_assets as restrictive for update to rental_app using (app_private.app_organization_allowed(organization_id)) with check (app_private.app_organization_allowed(organization_id));
create policy partner_organization_delete_lifecycle on public.media_assets as restrictive for delete to rental_app using (app_private.app_organization_allowed(organization_id));
drop policy partner_organization_lifecycle on public.virtual_tours;
create policy partner_organization_lifecycle on public.virtual_tours as restrictive for select to rental_app using (app_private.app_organization_allowed(organization_id) or app_private.agent_represents_resource(resource_id));
create policy partner_organization_write_lifecycle on public.virtual_tours as restrictive for insert to rental_app with check (app_private.app_organization_allowed(organization_id));
create policy partner_organization_update_lifecycle on public.virtual_tours as restrictive for update to rental_app using (app_private.app_organization_allowed(organization_id)) with check (app_private.app_organization_allowed(organization_id));
create policy partner_organization_delete_lifecycle on public.virtual_tours as restrictive for delete to rental_app using (app_private.app_organization_allowed(organization_id));
drop policy partner_organization_lifecycle on public.listing_sale_terms;
create policy partner_organization_lifecycle on public.listing_sale_terms as restrictive for select to rental_app using (app_private.app_organization_allowed(organization_id) or app_private.agent_may_view_commercial(listing_id));
create policy partner_organization_write_lifecycle on public.listing_sale_terms as restrictive for insert to rental_app with check (app_private.app_organization_allowed(organization_id));
create policy partner_organization_update_lifecycle on public.listing_sale_terms as restrictive for update to rental_app using (app_private.app_organization_allowed(organization_id)) with check (app_private.app_organization_allowed(organization_id));
create policy partner_organization_delete_lifecycle on public.listing_sale_terms as restrictive for delete to rental_app using (app_private.app_organization_allowed(organization_id));
create or replace function app_private.agent_may_write_listing_media(object_name text)
returns boolean language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
declare org uuid:=app_private.storage_org_from_path(object_name); target text:=split_part(object_name,'/',3);
begin
 if org is null or split_part(object_name,'/',2)<>'listings' or target!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return false; end if;
 return app_private.auth_agent_listing(target::uuid) and exists(select 1 from public.listing_representations r where r.listing_id=target::uuid and r.organization_id=org and r.agent_id=app_private.current_auth_agent() and r.can_edit_listing and app_private.representation_current(r));
end $$;
create or replace function app_private.agent_may_write_tour_media(object_name text)
returns boolean language plpgsql stable security definer set search_path=pg_catalog,pg_temp as $$
declare org uuid:=app_private.storage_org_from_path(object_name); target text:=split_part(object_name,'/',2);
begin
 if org is null or target!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return false; end if;
 return exists(select 1 from public.virtual_tours t join public.listings l on l.resource_id=t.resource_id join public.listing_representations r on r.listing_id=l.id where t.id=target::uuid and t.organization_id=org and r.agent_id=app_private.current_auth_agent() and r.can_manage_tour and app_private.representation_current(r) and app_private.auth_agent_listing(l.id));
end $$;
create or replace function app_private.agent_has_customer(target uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,pg_temp as $$
 select exists(select 1 from public.conversations c where c.customer_id=target and c.agent_id=app_private.current_app_agent() and app_private.agent_represents_listing(c.listing_id))
 or exists(select 1 from public.inquiries i where i.customer_id=target and i.agent_id=app_private.current_app_agent() and app_private.agent_represents_listing(i.listing_id))
 or exists(select 1 from public.viewings v where v.customer_id=target and v.agent_id=app_private.current_app_agent() and app_private.agent_represents_listing(v.listing_id))
 or exists(select 1 from public.lead_assignments a where a.customer_id=target and a.agent_id=app_private.current_app_agent() and a.status in ('ASSIGNED','ACCEPTED') and app_private.agent_represents_listing(a.listing_id));
$$;
drop policy agent_own_representation on public.listing_representations;
create policy agent_own_representation on public.listing_representations to rental_app using (agent_id=app_private.current_app_agent() and exists(select 1 from public.agent_profiles a where a.id=agent_id and a.verification_state='VERIFIED'));
alter policy listing_media_member_update on storage.objects with check(bucket_id='listing-media' and app_private.is_org_member(app_private.storage_org_from_path(name)));
alter policy tour_media_member_update on storage.objects with check(bucket_id='tour-media' and app_private.is_org_member(app_private.storage_org_from_path(name)));
alter policy listing_media_agent_update on storage.objects with check(bucket_id='listing-media' and app_private.agent_may_write_listing_media(name));
alter policy tour_media_agent_update on storage.objects with check(bucket_id='tour-media' and app_private.agent_may_write_tour_media(name));

create or replace function app_private.lead_assignment_candidates(
  target_listing uuid,
  target_customer uuid,
  window_from timestamptz,
  window_to timestamptz,
  window_day date,
  window_name text,
  fairness_since timestamptz,
  reliability_since timestamptz
)
returns table (
  representation_id uuid,
  agent_id uuid,
  organization_id uuid,
  representation_type text,
  is_primary boolean,
  representation_accepts_leads boolean,
  valid_from timestamptz,
  valid_until timestamptz,
  initiated_by text,
  agent_display_name text,
  agent_verification_state text,
  agent_accepts_leads boolean,
  agent_lead_capacity integer,
  agent_deactivated boolean,
  organization_state text,
  agent_specialties text[],
  agent_areas_served text[],
  active_leads bigint,
  recent_assignments bigint,
  last_assigned_at timestamptz,
  accepted_assignments bigint,
  missed_assignments bigint,
  schedule_conflicts bigint,
  listing_activity bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.id, r.agent_id, r.organization_id, r.representation_type, r.is_primary, r.accepts_leads,
    r.valid_from, r.valid_until, r.initiated_by,
    a.display_name, a.verification_state, a.accepts_leads, a.lead_capacity,
    (u.deactivated_at is not null),
    o.state,
    a.specialties, a.areas_served,
    (select count(*) from public.lead_assignments la
      where la.agent_id = r.agent_id and la.status in ('ASSIGNED', 'ACCEPTED')),
    (select count(*) from public.lead_assignments la
      where la.agent_id = r.agent_id and la.assigned_at >= fairness_since),
    (select max(la.assigned_at) from public.lead_assignments la where la.agent_id = r.agent_id),
    (select count(*) from public.lead_assignments la
      where la.agent_id = r.agent_id and la.assigned_at >= reliability_since and la.accepted_at is not null),
    (select count(*) from public.lead_assignments la
      where la.agent_id = r.agent_id and la.assigned_at >= reliability_since
        and la.release_reason in ('RESPONSE_TIMEOUT', 'AGENT_DECLINED', 'AGENT_UNAVAILABLE')),
    (select count(*) from public.viewings v
      where v.agent_id = r.agent_id
        and v.status in ('REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED')
        and (
          (v.scheduled_at is not null and v.scheduled_at >= window_from and v.scheduled_at < window_to)
          or (v.scheduled_at is null and v.preferred_date = window_day and v.preferred_window = window_name)
        )),
    (select count(*) from public.lead_assignments la
      where la.agent_id = r.agent_id and la.listing_id = target_listing and la.customer_id <> target_customer
        and la.accepted_at is not null)
  from public.listing_representations r
  join public.agent_profiles a on a.id = r.agent_id
  join public.user_profiles u on u.id = a.user_id
  join public.organizations o on o.id = r.organization_id
  where r.listing_id = target_listing and r.state = 'ACTIVE' and app_private.representation_current(r) and a.id=app_private.agent_eligible(a.user_id) and o.state<>'SUSPENDED';
$$;

create or replace function app_private.resolve_referral_code(target_code text,target_listing uuid)
returns uuid language sql stable security definer set search_path=pg_catalog,pg_temp as $$
 select c.agent_id from public.agent_referral_codes c join public.agent_profiles a on a.id=c.agent_id
 join public.listing_representations r on r.agent_id=c.agent_id and r.listing_id=c.listing_id
 join public.organizations o on o.id=r.organization_id
 where c.code=upper(target_code) and c.listing_id=target_listing and c.revoked_at is null
 and a.id=app_private.agent_eligible(a.user_id) and a.verification_state='VERIFIED' and o.state<>'SUSPENDED' and app_private.representation_current(r);
$$;
alter table public.rentable_resources add constraint resource_root_tenant foreign key(root_id,organization_id) references public.rentable_resources(id,organization_id) deferrable initially deferred;
create function app_private.guard_identity_authority()
returns trigger language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
 if session_user<>'rental_app' and coalesce(current_setting('role',true),'')<>'rental_app' then return new; end if;
 if tg_op='UPDATE' then
  if (to_jsonb(new)-'revoked_at') is distinct from (to_jsonb(old)-'revoked_at') or (old.revoked_at is not null and new.revoked_at is null) then
   raise exception 'Authority changes require explicit platform provisioning' using errcode='42501';
  end if;
  return new;
 end if;
 if new.user_id is distinct from app_private.current_app_user() or not app_private.actor_active(new.user_id) then raise exception 'Authority changes require explicit platform provisioning' using errcode='42501'; end if;
 if tg_table_name='organization_members' then
  if new.role<>'OWNER' or not exists(select 1 from public.organizations o where o.id=new.organization_id and o.onboarding_user_id=new.user_id and o.state='DRAFT') then
   raise exception 'Authority changes require explicit platform provisioning' using errcode='42501';
  end if;
 elsif not (
  (new.capability='CUSTOMER' and new.source_type='REGISTRATION' and new.organization_id is null)
  or (new.capability='AGENT' and new.source_type='REGISTRATION' and new.organization_id is null
   and exists(select 1 from public.agent_profiles a where a.id=new.source_id and a.user_id=new.user_id and a.verification_state<>'SUSPENDED')
   and not exists(select 1 from public.user_capabilities c where c.user_id=new.user_id and c.capability='AGENT' and c.revoked_at is not null))
  or (new.capability='OWNER' and new.source_type='MEMBERSHIP' and new.source_id=new.organization_id
   and exists(select 1 from public.organizations o join public.organization_members m on m.organization_id=o.id where o.id=new.organization_id and o.onboarding_user_id=new.user_id and o.state='DRAFT' and m.user_id=new.user_id and m.role='OWNER' and m.revoked_at is null))
 ) then raise exception 'Authority changes require explicit platform provisioning' using errcode='42501';
 end if;
 return new;
end $$;
create trigger capability_authority before insert or update on public.user_capabilities for each row execute function app_private.guard_identity_authority();
create trigger membership_authority before insert or update on public.organization_members for each row execute function app_private.guard_identity_authority();
revoke all on function app_private.guard_identity_authority() from public,anon,authenticated,rental_app;
create function app_private.guard_partner_lifecycle()
returns trigger language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
 if session_user<>'rental_app' and coalesce(current_setting('role',true),'')<>'rental_app' then return new; end if;
 if tg_table_name='organizations' then
  if new.onboarding_user_id is distinct from old.onboarding_user_id or (new.state is distinct from old.state and not (old.state='DRAFT' and new.state='PENDING_VERIFICATION')) then
   raise exception 'Partner lifecycle changes require explicit platform review' using errcode='42501';
  end if;
 elsif old.deactivated_at is not null and new.deactivated_at is null then
  raise exception 'Account reactivation requires explicit platform review' using errcode='42501';
 end if;
 return new;
end $$;
create trigger partner_lifecycle before update on public.organizations for each row execute function app_private.guard_partner_lifecycle();
create trigger identity_lifecycle before update on public.user_profiles for each row execute function app_private.guard_partner_lifecycle();
revoke all on function app_private.guard_partner_lifecycle() from public,anon,authenticated,rental_app;
