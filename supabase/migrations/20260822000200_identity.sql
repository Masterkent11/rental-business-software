-- Sprint 2 — Identity.
--
-- Supabase Auth owns credentials, verification, and session refresh. This
-- schema owns everything Supabase Auth must NOT be trusted for: capabilities,
-- organization membership, and staff assignments (ADR-0007).
--
-- `user_profiles.id` mirrors `auth.users.id`. There is no foreign key to it:
-- the auth schema is Supabase's, and depending on its shape is exactly the
-- coupling ADR-0001 keeps out of the domain. The id is the contract.

create table user_profiles (
  id            uuid primary key,
  display_name  text not null default '',
  email         text,
  mobile        text,
  created_at    timestamptz not null default now(),
  -- D-15: one account for life. Deactivation is not deletion — a former tenant's
  -- payment history has to survive them leaving.
  deactivated_at timestamptz
);

create unique index user_profiles_mobile on user_profiles (mobile) where mobile is not null;

-- Membership in an organization, with the role held there.
--
-- A user belongs to no organization by default (entities.md: identity is
-- platform-scoped). Membership is what makes X-Organization-Id legitimate, and
-- the API verifies the header against this table rather than trusting it.
create table organization_members (
  user_id         uuid not null references user_profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  role            text not null check (role in ('OWNER','STAFF')),
  granted_at      timestamptz not null default now(),
  revoked_at      timestamptz,
  primary key (user_id, organization_id, role)
);

create index organization_members_user on organization_members (user_id) where revoked_at is null;

-- Capabilities a user holds *because of a fact*, not because someone granted
-- them a badge.
--
-- TENANT exists because a lease is active. GUEST exists because a stay is in
-- progress. Storing them as standalone grants would mean two sources of truth
-- that drift — the lease ends and the badge stays. So each row records **what
-- makes it true**, and the row is closed when that stops being true.
--
-- Sprint 2 populates CUSTOMER, OWNER, and STAFF. TENANT and GUEST arrive with
-- leases (Sprint 4) and stays (Sprint 3); the shape is here so they slot in
-- without a migration under load.
create table user_capabilities (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references user_profiles(id) on delete cascade,
  capability      text not null
                  check (capability in ('CUSTOMER','TENANT','GUEST','OWNER','STAFF','PLATFORM_ADMIN')),
  -- Null for platform-wide capabilities (CUSTOMER, PLATFORM_ADMIN); set for
  -- capabilities that only mean anything inside one organization.
  organization_id uuid references organizations(id),
  -- What makes this true, so revocation has something to key on.
  source_type     text not null check (source_type in ('REGISTRATION','MEMBERSHIP','LEASE','STAY','PLATFORM')),
  source_id       uuid,
  granted_at      timestamptz not null default now(),
  revoked_at      timestamptz
);

-- One live row per (user, capability, organization). Re-granting an active
-- capability is a no-op rather than a duplicate.
create unique index user_capabilities_live
  on user_capabilities (user_id, capability, coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where revoked_at is null;

create index user_capabilities_lookup on user_capabilities (user_id) where revoked_at is null;

-- D-15's demo: saved listings follow the account, not the device.
create table saved_listings (
  user_id    uuid not null references user_profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  saved_at   timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index saved_listings_user on saved_listings (user_id, saved_at desc);

alter table user_profiles         enable row level security;
alter table organization_members  enable row level security;
alter table user_capabilities     enable row level security;
alter table saved_listings        enable row level security;

-- Identity is platform-scoped, so these are NOT organization-isolated. They are
-- user-isolated: the scope that matters here is "am I this user".
--
-- app.user_id is set per transaction alongside app.organization_id, and is
-- transaction-local for the same reason: a pooled connection must not carry one
-- request's identity into the next.
create policy own_profile on user_profiles using (
  id = nullif(current_setting('app.user_id', true), '')::uuid
);
create policy own_membership on organization_members using (
  user_id = nullif(current_setting('app.user_id', true), '')::uuid
);
create policy own_capabilities on user_capabilities using (
  user_id = nullif(current_setting('app.user_id', true), '')::uuid
);
create policy own_saved on saved_listings using (
  user_id = nullif(current_setting('app.user_id', true), '')::uuid
);
