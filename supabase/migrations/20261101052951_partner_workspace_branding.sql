create table app_private.partner_branding (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid unique references public.organizations(id) on delete cascade,
 agent_id uuid unique references public.agent_profiles(id) on delete cascade,
 logo text not null check (octet_length(logo)<=174788 and logo ~ '^data:image/webp;base64,[A-Za-z0-9+/]+={0,2}$'),
 updated_at timestamptz not null default now(),
 constraint partner_branding_one_owner check (num_nonnulls(organization_id,agent_id)=1)
);
alter table app_private.partner_branding enable row level security;
alter table app_private.partner_branding force row level security;
revoke all on app_private.partner_branding from public,anon,authenticated;
grant select,insert,update,delete on app_private.partner_branding to rental_app;
create policy partner_branding_read on app_private.partner_branding for select to rental_app using (
 (organization_id=app_private.current_app_organization() and app_private.owner_member(app_private.current_app_user(),organization_id))
 or agent_id=app_private.current_app_agent()
);
create policy partner_branding_insert on app_private.partner_branding for insert to rental_app with check (
 (organization_id=app_private.current_app_organization() and app_private.owner_member(app_private.current_app_user(),organization_id)
 and exists(select 1 from public.organization_members m where m.user_id=app_private.current_app_user() and m.organization_id=partner_branding.organization_id and m.role='OWNER' and m.revoked_at is null))
 or agent_id=app_private.current_app_agent()
);
create policy partner_branding_update on app_private.partner_branding for update to rental_app using (
 (organization_id=app_private.current_app_organization() and app_private.owner_member(app_private.current_app_user(),organization_id)
 and exists(select 1 from public.organization_members m where m.user_id=app_private.current_app_user() and m.organization_id=partner_branding.organization_id and m.role='OWNER' and m.revoked_at is null))
 or agent_id=app_private.current_app_agent()
) with check (
 (organization_id=app_private.current_app_organization() and app_private.owner_member(app_private.current_app_user(),organization_id)
 and exists(select 1 from public.organization_members m where m.user_id=app_private.current_app_user() and m.organization_id=partner_branding.organization_id and m.role='OWNER' and m.revoked_at is null))
 or agent_id=app_private.current_app_agent()
);
create policy partner_branding_delete on app_private.partner_branding for delete to rental_app using (
 (organization_id=app_private.current_app_organization() and app_private.owner_member(app_private.current_app_user(),organization_id)
 and exists(select 1 from public.organization_members m where m.user_id=app_private.current_app_user() and m.organization_id=partner_branding.organization_id and m.role='OWNER' and m.revoked_at is null))
 or agent_id=app_private.current_app_agent()
);
