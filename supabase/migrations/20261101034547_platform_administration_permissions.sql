create table app_private.platform_permissions (
 user_id uuid not null references public.user_profiles(id),
 permission text not null check(permission in ('PARTNER_MONITOR','AGENT_REVIEW','IDENTITY_REVIEW')),
 granted_at timestamptz not null default now(),
 expires_at timestamptz,
 revoked_at timestamptz,
 primary key(user_id,permission),
 check(expires_at is null or expires_at>granted_at)
);
create table app_private.platform_audit_events (
 id uuid primary key default gen_random_uuid(),
 actor_user_id uuid not null references public.user_profiles(id),
 action text not null check(action in ('PARTNER_MONITOR','AGENT_REVIEW','IDENTITY_REVIEW')),
 target_id uuid,
 phase text not null default 'AUTHORIZATION' check(phase in ('AUTHORIZATION','MUTATION')),
 outcome text not null check(outcome in ('ALLOWED','DENIED')),
 purpose text not null check(length(purpose) between 3 and 200),
 request_id text not null check(length(request_id) between 1 and 100),
 occurred_at timestamptz not null default now()
);
create index platform_audit_actor_time on app_private.platform_audit_events(actor_user_id,occurred_at desc);
alter table app_private.platform_permissions enable row level security;
alter table app_private.platform_audit_events enable row level security;
revoke all on app_private.platform_permissions,app_private.platform_audit_events from public,anon,authenticated,rental_app;
create function app_private.has_admin_permission(target text)
returns boolean language sql stable security definer set search_path=pg_catalog,pg_temp as $$
 select app_private.actor_active(app_private.current_app_user()) and exists(
 select 1 from app_private.platform_permissions p join public.user_capabilities c on c.user_id=p.user_id
 where p.user_id=app_private.current_app_user() and p.permission=target and p.revoked_at is null and (p.expires_at is null or p.expires_at>now())
 and c.capability='PLATFORM_ADMIN' and c.revoked_at is null);
$$;
create or replace function app_private.current_app_is_platform_admin()
returns boolean language sql stable security definer set search_path=pg_catalog,pg_temp as $$
 select app_private.has_admin_permission('AGENT_REVIEW') and current_setting('app.assurance_level',true)='aal2';
$$;
create function app_private.record_platform_audit(action text,target uuid,outcome text,purpose text,request_id text,phase text default 'AUTHORIZATION')
returns void language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
 if outcome='ALLOWED' and (not app_private.has_admin_permission(action) or coalesce(current_setting('app.assurance_level',true),'')<>'aal2') then raise exception 'Administrative access denied' using errcode='42501'; end if;
 insert into app_private.platform_audit_events(actor_user_id,action,target_id,outcome,purpose,request_id,phase)
 values(app_private.current_app_user(),action,target,outcome,purpose,request_id,phase);
end $$;
create function app_private.monitor_partners(purpose text,request_id text)
returns table(kind text,state text,total bigint) language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
 if not app_private.has_admin_permission('PARTNER_MONITOR') or coalesce(current_setting('app.assurance_level',true),'')<>'aal2' then
 raise exception 'Administrative access denied' using errcode='42501';
 end if;
 return query select 'OWNER'::text,o.state,count(*) from public.organizations o group by o.state
 union all select 'AGENT'::text,a.verification_state,count(*) from public.agent_profiles a group by a.verification_state;
end $$;
revoke all on function app_private.has_admin_permission(text),app_private.record_platform_audit(text,uuid,text,text,text,text),app_private.monitor_partners(text,text) from public,anon,authenticated;
grant execute on function app_private.has_admin_permission(text),app_private.record_platform_audit(text,uuid,text,text,text,text),app_private.monitor_partners(text,text) to rental_app;
create function app_private.agent_verification_audit()
returns trigger language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
 if session_user='rental_app' or current_setting('role',true)='rental_app' then
 if new.verification_state is distinct from old.verification_state and current_setting('app.verification_actor',true)<>'' then
 if not app_private.current_app_is_platform_admin() then raise exception 'Administrative access denied' using errcode='42501'; end if;
 perform app_private.record_platform_audit('AGENT_REVIEW',new.id,'ALLOWED',current_setting('app.admin_purpose',true),current_setting('app.request_id',true),'MUTATION');
 end if;
 end if;
 return new;
end $$;
create trigger agent_verification_audit after update on public.agent_profiles for each row execute function app_private.agent_verification_audit();
revoke all on function app_private.agent_verification_audit() from public,anon,authenticated,rental_app;
