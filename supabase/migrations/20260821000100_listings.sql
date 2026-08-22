-- Sprint 1 — the read path.
--
-- Only the tables the discovery and listing-detail screens need. Occupancy,
-- money, and identity arrive in later sprints with their own migrations; a
-- whole-schema migration now would be a guess about tables no story uses yet.
--
-- Every organization-scoped table carries organization_id DIRECTLY rather than
-- reaching it through a join (relationships.md). Denormalised on purpose:
-- isolation is enforced at the row, so it must be checkable at the row. A
-- policy that walks four joins is one a hurried query will eventually bypass.

create extension if not exists "uuid-ossp";

create table organizations (
  id            uuid primary key default uuid_generate_v4(),
  legal_name    text not null,
  trading_name  text not null,
  -- D-11: an unverified organization may build everything and publish nothing.
  state         text not null default 'DRAFT'
                check (state in ('DRAFT','PENDING_VERIFICATION','VERIFIED',
                                 'REJECTED','SUSPENDED')),
  -- U-03: managers may submit; publishing needs the owner unless delegated.
  publish_delegation boolean not null default false,
  created_at    timestamptz not null default now()
);

create table properties (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  name            text not null,
  area_label      text not null,   -- barangay
  city_label      text not null,
  created_at      timestamptz not null default now(),
  -- Composite target so children can enforce same-organization references.
  unique (id, organization_id)
);

create table rentable_resources (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  property_id     uuid not null,
  parent_id       uuid references rentable_resources(id),
  -- Materialised ancestor path. ADR-0005 evaluates overlap over this, so it is
  -- maintained from the first migration rather than retrofitted under load.
  root_id         uuid not null,
  label           text not null,
  resource_type   text not null
                  check (resource_type in ('UNIT','ROOM','BED_SPACE',
                                           'PARKING','STORAGE')),
  -- U-01: HYBRID means both offers live at once, not switchable.
  rental_mode     text not null
                  check (rental_mode in ('LONG_TERM','SHORT_TERM','HYBRID')),
  state           text not null default 'ACTIVE'
                  check (state in ('DRAFT','ACTIVE','ARCHIVED')),
  -- For a bed space this is the whole question: what do I share, and with how
  -- many people. Empty for a whole unit.
  shared_facilities text[] not null default '{}',
  created_at      timestamptz not null default now(),
  -- I-02: a resource can never point at another organization's property.
  foreign key (property_id, organization_id)
    references properties(id, organization_id),
  unique (id, organization_id)
);

create table listings (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id),
  resource_id      uuid not null,
  -- A listing has ONE kind. A hybrid resource carries two listings, priced and
  -- worded independently — that is why the listing is not the resource.
  kind             text not null check (kind in ('LONG_TERM','SHORT_TERM')),
  title            text not null,
  description      text not null default '',
  -- Integer centavos. P-06: no floating point near an amount, ever.
  price_centavos   bigint not null check (price_centavos >= 0),
  currency         text not null default 'PHP' check (currency = 'PHP'),
  -- Detail-screen content. Arrays rather than child tables: these are
  -- owner-authored prose with no identity, no ordering rules, and nothing else
  -- references them. A join table would be ceremony for no gain.
  amenities        text[] not null default '{}',
  house_rules      text[] not null default '{}',
  terms            text[] not null default '{}',
  -- Short-term only. Null for a monthly listing.
  min_stay_nights  int check (min_stay_nights is null or min_stay_nights > 0),
  -- Long-term only. PH norm is 1 month advance + 2 months deposit, but it
  -- varies by owner, so it is data rather than a constant in code.
  advance_months   int not null default 0 check (advance_months >= 0),
  deposit_months   int not null default 0 check (deposit_months >= 0),
  state            text not null default 'DRAFT'
                   check (state in ('DRAFT','PENDING_APPROVAL','APPROVED',
                                    'PUBLISHED','UNPUBLISHED','REJECTED',
                                    'ARCHIVED')),
  created_at       timestamptz not null default now(),
  foreign key (resource_id, organization_id)
    references rentable_resources(id, organization_id)
);

-- One listing per kind per resource: the 0:2 cardinality in relationships.md,
-- enforced rather than described.
create unique index listings_one_per_kind
  on listings (resource_id, kind)
  where state <> 'ARCHIVED';

create index listings_published on listings (state) where state = 'PUBLISHED';
create index listings_org on listings (organization_id);

create table media_assets (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  listing_id      uuid references listings(id),
  resource_id     uuid,
  kind            text not null check (kind in ('PHOTO','PANORAMA','VIDEO')),
  storage_url     text not null,
  position        int not null default 0,
  created_at      timestamptz not null default now()
);

create index media_listing on media_assets (listing_id, position);

create table virtual_tours (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  resource_id     uuid not null,
  -- The tour hangs off the RESOURCE, not the listing: a hybrid resource shows
  -- the same walkthrough on both its listings, authored once.
  state           text not null default 'DRAFT'
                  check (state in ('DRAFT','PROCESSING','READY','PUBLISHED',
                                   'UNPUBLISHED','FAILED')),
  scene_count     int not null default 0,
  foreign key (resource_id, organization_id)
    references rentable_resources(id, organization_id),
  unique (resource_id)
);

-- ---------------------------------------------------------------- RLS
--
-- ADR-0006: the API connects as a role RLS APPLIES to — never service_role,
-- which bypasses policies entirely and leaves one isolation layer wearing a
-- costume of two. Scope is set per transaction and is transaction-local, so a
-- pooled connection cannot leak one request's scope into the next.

alter table organizations       enable row level security;
alter table properties          enable row level security;
alter table rentable_resources  enable row level security;
alter table listings            enable row level security;
alter table media_assets        enable row level security;
alter table virtual_tours       enable row level security;

-- Policies express ISOLATION ONLY. Authorization — who may do what — is the
-- application's job; a policy carrying product rules is a rule the domain
-- cannot test and a migration reviewer cannot see.
create policy org_isolation on properties using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
create policy org_isolation on rentable_resources using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
create policy org_isolation on media_assets using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
create policy org_isolation on virtual_tours using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);

-- The marketplace is deliberately cross-organization: a customer searching
-- Cebu should see every verified owner. Published listings are readable by
-- anyone; everything else is scoped.
create policy listings_public_read on listings for select using (
  state = 'PUBLISHED'
  or organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
create policy organizations_read on organizations for select using (true);
