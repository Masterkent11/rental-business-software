alter table listing_representations add column if not exists representation_type text not null default 'NON_EXCLUSIVE';
alter table listing_representations drop constraint if exists listing_representations_type_check;
alter table listing_representations add constraint listing_representations_type_check check (
  representation_type in ('EXCLUSIVE', 'NON_EXCLUSIVE', 'OWNER_DIRECT')
);
alter table listing_representations add column if not exists is_primary boolean not null default false;
alter table listing_representations add column if not exists accepts_leads boolean not null default true;
alter table listing_representations add column if not exists valid_from timestamptz;
alter table listing_representations add column if not exists valid_until timestamptz;
alter table listing_representations add column if not exists initiated_by text not null default 'OWNER';
alter table listing_representations drop constraint if exists listing_representations_initiated_by_check;
alter table listing_representations add constraint listing_representations_initiated_by_check check (
  initiated_by in ('OWNER', 'AGENT')
);
alter table listing_representations drop constraint if exists listing_representations_validity_check;
alter table listing_representations add constraint listing_representations_validity_check check (
  valid_from is null or valid_until is null or valid_until > valid_from
);

drop index if exists listing_representations_current;
create unique index if not exists listing_representations_agent_current
  on listing_representations (listing_id, agent_id) where state in ('PENDING', 'ACTIVE');
create unique index if not exists listing_representations_one_exclusive
  on listing_representations (listing_id) where state = 'ACTIVE' and representation_type = 'EXCLUSIVE';
create unique index if not exists listing_representations_one_primary
  on listing_representations (listing_id) where state = 'ACTIVE' and is_primary;
create index if not exists listing_representations_listing_active
  on listing_representations (listing_id) where state = 'ACTIVE';

alter table agent_profiles add column if not exists accepts_leads boolean not null default true;
alter table agent_profiles add column if not exists lead_capacity integer not null default 20;
alter table agent_profiles drop constraint if exists agent_profiles_lead_capacity_check;
alter table agent_profiles add constraint agent_profiles_lead_capacity_check check (lead_capacity between 1 and 500);

create table if not exists lead_assignments (
  id                      uuid primary key default uuid_generate_v4(),
  organization_id         uuid not null references organizations(id),
  listing_id              uuid not null references listings(id),
  customer_id             uuid not null references user_profiles(id),
  representation_id       uuid references listing_representations(id),
  agent_id                uuid not null references agent_profiles(id),
  purpose                 text not null,
  status                  text not null default 'ASSIGNED',
  assignment_reason       text not null,
  score                   numeric(6, 2),
  score_breakdown         jsonb not null default '{}'::jsonb,
  candidates_considered   integer not null default 0,
  previous_assignment_id  uuid references lead_assignments(id),
  release_reason          text,
  response_due_at         timestamptz,
  assigned_at             timestamptz not null default now(),
  accepted_at             timestamptz,
  released_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint lead_assignments_purpose_check check (purpose in ('INQUIRY', 'VIEWING')),
  constraint lead_assignments_status_check check (status in ('ASSIGNED', 'ACCEPTED', 'RELEASED', 'REASSIGNED', 'CLOSED')),
  constraint lead_assignments_reason_check check (assignment_reason in (
    'EXISTING_RELATIONSHIP', 'REFERRAL_ATTRIBUTION', 'EXCLUSIVE_REPRESENTATION', 'PRIMARY_REPRESENTATIVE', 'BEST_AVAILABLE'
  )),
  constraint lead_assignments_release_reason_check check (release_reason is null or release_reason in (
    'RESPONSE_TIMEOUT', 'AGENT_DECLINED', 'AGENT_UNAVAILABLE', 'REPRESENTATION_ENDED', 'CUSTOMER_CLOSED'
  )),
  constraint lead_assignments_released_consistent check (
    (status in ('RELEASED', 'REASSIGNED')) = (released_at is not null)
  ),
  constraint lead_assignments_accepted_consistent check (status <> 'ACCEPTED' or accepted_at is not null),
  constraint lead_assignments_score_range check (score is null or score between 0 and 100),
  unique (id, organization_id)
);

create unique index if not exists lead_assignments_one_active
  on lead_assignments (listing_id, customer_id) where status in ('ASSIGNED', 'ACCEPTED');
create index if not exists lead_assignments_agent_active
  on lead_assignments (agent_id) where status in ('ASSIGNED', 'ACCEPTED');
create index if not exists lead_assignments_agent_recent on lead_assignments (agent_id, assigned_at desc);
create index if not exists lead_assignments_due
  on lead_assignments (response_due_at) where status = 'ASSIGNED' and response_due_at is not null;
create index if not exists lead_assignments_customer on lead_assignments (customer_id, listing_id, assigned_at desc);

alter table lead_assignments enable row level security;

drop policy if exists org_isolation on lead_assignments;
create policy org_isolation on lead_assignments using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
drop policy if exists own_lead_assignment on lead_assignments;
create policy own_lead_assignment on lead_assignments to rental_app using (
  customer_id = nullif(current_setting('app.user_id', true), '')::uuid
);
drop policy if exists agent_lead_assignment on lead_assignments;
create policy agent_lead_assignment on lead_assignments to rental_app using (
  agent_id = app_private.current_app_agent()
);

create or replace function app_private.customer_assigned_agent(target_agent uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from lead_assignments la
     where la.agent_id = target_agent
       and la.customer_id = nullif(current_setting('app.user_id', true), '')::uuid
       and la.status in ('ASSIGNED', 'ACCEPTED')
  );
$$;
revoke all on function app_private.customer_assigned_agent(uuid) from public;
grant execute on function app_private.customer_assigned_agent(uuid) to rental_app;

drop policy if exists assigned_agent_read on agent_profiles;
create policy assigned_agent_read on agent_profiles for select to rental_app using (
  app_private.customer_assigned_agent(id)
);

create or replace function app_private.organization_works_with_agent(target_agent uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from listing_representations r
     where r.agent_id = target_agent
       and r.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  );
$$;
revoke all on function app_private.organization_works_with_agent(uuid) from public;
grant execute on function app_private.organization_works_with_agent(uuid) to rental_app;

drop policy if exists organization_agent_read on agent_profiles;
create policy organization_agent_read on agent_profiles for select to rental_app using (
  app_private.organization_works_with_agent(id)
);

create table if not exists agent_referral_codes (
  code        text primary key,
  agent_id    uuid not null references agent_profiles(id) on delete cascade,
  listing_id  uuid not null references listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  constraint agent_referral_codes_format check (code ~ '^[A-Z0-9]{10}$')
);

create unique index if not exists agent_referral_codes_current
  on agent_referral_codes (agent_id, listing_id) where revoked_at is null;

alter table agent_referral_codes enable row level security;

drop policy if exists agent_own_referral_code on agent_referral_codes;
create policy agent_own_referral_code on agent_referral_codes to rental_app using (
  agent_id = app_private.current_app_agent()
);

create table if not exists lead_referrals (
  id             uuid primary key default uuid_generate_v4(),
  listing_id     uuid not null references listings(id) on delete cascade,
  customer_id    uuid not null references user_profiles(id) on delete cascade,
  agent_id       uuid not null references agent_profiles(id) on delete cascade,
  code           text not null references agent_referral_codes(code),
  attributed_at  timestamptz not null default now(),
  unique (listing_id, customer_id)
);

alter table lead_referrals enable row level security;

drop policy if exists own_lead_referral on lead_referrals;
create policy own_lead_referral on lead_referrals to rental_app using (
  customer_id = nullif(current_setting('app.user_id', true), '')::uuid
);
drop policy if exists agent_lead_referral on lead_referrals;
create policy agent_lead_referral on lead_referrals for select to rental_app using (
  agent_id = app_private.current_app_agent()
);

alter table viewings alter column scheduled_at drop not null;
alter table viewings add column if not exists preferred_date date;
alter table viewings add column if not exists preferred_window text;
alter table viewings add column if not exists time_zone text not null default 'Asia/Manila';
alter table viewings add column if not exists lead_assignment_id uuid references lead_assignments(id);
alter table viewings add column if not exists representation_id uuid references listing_representations(id);
alter table viewings add column if not exists declined_at timestamptz;
alter table viewings add column if not exists agent_change_notice text;

alter table viewings drop constraint if exists viewings_status_check;
alter table viewings add constraint viewings_status_check check (
  status in ('MATCHING', 'REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'DECLINED', 'COMPLETED', 'CANCELLED')
);
alter table viewings drop constraint if exists viewings_preferred_window_check;
alter table viewings add constraint viewings_preferred_window_check check (
  preferred_window is null or preferred_window in ('MORNING', 'AFTERNOON', 'EVENING')
);
alter table viewings drop constraint if exists viewings_schedule_present;
alter table viewings add constraint viewings_schedule_present check (
  scheduled_at is not null or (preferred_date is not null and preferred_window is not null)
);
alter table viewings drop constraint if exists viewings_confirmed_has_time;
alter table viewings add constraint viewings_confirmed_has_time check (
  status not in ('CONFIRMED', 'COMPLETED') or scheduled_at is not null
);
alter table viewings drop constraint if exists viewings_matching_has_no_agent;
alter table viewings add constraint viewings_matching_has_no_agent check (status <> 'MATCHING' or agent_id is null);
alter table viewings drop constraint if exists viewings_notice_length;
alter table viewings add constraint viewings_notice_length check (
  agent_change_notice is null or char_length(agent_change_notice) <= 300
);

drop index if exists viewings_one_active_per_customer;
create unique index if not exists viewings_one_active_per_customer
  on viewings (listing_id, customer_id) where status in ('MATCHING', 'REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED');
create index if not exists viewings_agent_preferred
  on viewings (agent_id, preferred_date, preferred_window) where agent_id is not null;

alter table media_assets add column if not exists representation_id uuid references listing_representations(id) on delete cascade;
create index if not exists media_assets_representation on media_assets (representation_id) where representation_id is not null;

alter table listings add column if not exists possible_duplicate_of uuid references listings(id);

create table if not exists listing_change_proposals (
  id                uuid primary key default uuid_generate_v4(),
  organization_id   uuid not null references organizations(id),
  listing_id        uuid not null references listings(id) on delete cascade,
  proposed_by_agent uuid not null references agent_profiles(id),
  changes           jsonb not null,
  status            text not null default 'PENDING',
  created_at        timestamptz not null default now(),
  decided_at        timestamptz,
  decided_by        uuid references user_profiles(id),
  constraint listing_change_proposals_status_check check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  constraint listing_change_proposals_decided_consistent check ((status = 'PENDING') = (decided_at is null)),
  constraint listing_change_proposals_changes_object check (jsonb_typeof(changes) = 'object')
);

create index if not exists listing_change_proposals_pending
  on listing_change_proposals (organization_id, created_at desc) where status = 'PENDING';

alter table listing_change_proposals enable row level security;

drop policy if exists org_isolation on listing_change_proposals;
create policy org_isolation on listing_change_proposals using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
drop policy if exists agent_own_proposal on listing_change_proposals;
create policy agent_own_proposal on listing_change_proposals to rental_app using (
  proposed_by_agent = app_private.current_app_agent()
);

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
  where r.listing_id = target_listing and r.state = 'ACTIVE';
$$;

create or replace function app_private.resolve_referral_code(target_code text, target_listing uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.agent_id from public.agent_referral_codes c
   where c.code = upper(target_code) and c.listing_id = target_listing and c.revoked_at is null;
$$;

create or replace function app_private.due_lead_assignments(at timestamptz, max_rows integer)
returns table (id uuid, organization_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select la.id, la.organization_id from public.lead_assignments la
   where la.status = 'ASSIGNED' and la.response_due_at is not null and la.response_due_at <= at
   order by la.response_due_at
   limit greatest(1, least(max_rows, 200));
$$;

create or replace function app_private.matching_viewings(max_rows integer)
returns table (id uuid, organization_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select v.id, v.organization_id from public.viewings v
   where v.status = 'MATCHING'
   order by v.created_at
   limit greatest(1, least(max_rows, 200));
$$;

create or replace function app_private.sale_listing_duplicate_candidates(
  target_city text,
  target_type text,
  center_latitude double precision,
  center_longitude double precision,
  radius_meters double precision
)
returns table (
  listing_id uuid,
  organization_id uuid,
  state text,
  property_name text,
  address_line text,
  area_label text,
  city_label text,
  property_type text,
  latitude double precision,
  longitude double precision,
  bedrooms integer,
  bathrooms integer,
  floor_area_sqm integer,
  lot_area_sqm integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select l.id, l.organization_id, l.state, p.name, p.address_line, p.area_label, p.city_label, p.property_type,
         p.latitude, p.longitude, l.bedrooms, l.bathrooms, l.floor_area_sqm, l.lot_area_sqm
    from public.listings l
    join public.rentable_resources rr on rr.id = l.resource_id
    join public.properties p on p.id = rr.property_id
   where l.intent = 'SALE'
     and l.state in ('DRAFT', 'PUBLISHED')
     and lower(p.city_label) = lower(target_city)
     and p.property_type = target_type
     and (
       center_latitude is null or p.latitude is null
       or 2 * 6371008.8 * asin(least(1, sqrt(
            power(sin(radians(p.latitude - center_latitude) / 2), 2)
            + cos(radians(center_latitude)) * cos(radians(p.latitude))
            * power(sin(radians(p.longitude - center_longitude) / 2), 2)))) <= radius_meters
     )
   limit 50;
$$;

revoke all on function app_private.lead_assignment_candidates(uuid, uuid, timestamptz, timestamptz, date, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function app_private.resolve_referral_code(text, uuid) from public, anon, authenticated;
revoke all on function app_private.due_lead_assignments(timestamptz, integer) from public, anon, authenticated;
revoke all on function app_private.matching_viewings(integer) from public, anon, authenticated;
revoke all on function app_private.sale_listing_duplicate_candidates(text, text, double precision, double precision, double precision) from public, anon, authenticated;
grant execute on function app_private.lead_assignment_candidates(uuid, uuid, timestamptz, timestamptz, date, text, timestamptz, timestamptz) to rental_app;
grant execute on function app_private.resolve_referral_code(text, uuid) to rental_app;
grant execute on function app_private.due_lead_assignments(timestamptz, integer) to rental_app;
grant execute on function app_private.matching_viewings(integer) to rental_app;
grant execute on function app_private.sale_listing_duplicate_candidates(text, text, double precision, double precision, double precision) to rental_app;

create or replace function app_private.agent_has_customer(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.current_app_agent() is not null and (
    exists (
      select 1 from public.conversations c
       where c.customer_id = target and c.agent_id = app_private.current_app_agent()
    )
    or exists (
      select 1 from public.inquiries i
       where i.customer_id = target and i.agent_id = app_private.current_app_agent()
    )
    or exists (
      select 1 from public.viewings v
       where v.customer_id = target and v.agent_id = app_private.current_app_agent()
    )
    or exists (
      select 1 from public.lead_assignments la
       where la.customer_id = target and la.agent_id = app_private.current_app_agent()
         and la.status in ('ASSIGNED', 'ACCEPTED')
    )
  );
$$;

revoke all on lead_assignments from public, anon, authenticated;
revoke all on agent_referral_codes from public, anon, authenticated;
revoke all on lead_referrals from public, anon, authenticated;
revoke all on listing_change_proposals from public, anon, authenticated;
grant select, insert, update on lead_assignments to rental_app;
grant select, insert, update on agent_referral_codes to rental_app;
grant select, insert on lead_referrals to rental_app;
grant select, insert, update on listing_change_proposals to rental_app;
