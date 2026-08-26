-- Sprint 3 — Occupancy.
--
-- I-01 is the invariant the platform exists to keep: no two HELD or COMMITTED
-- occupancies on the same ancestor path may overlap in time. Leasing Unit 203
-- must block Room 101 and Bed A inside it.
--
-- ADR-0005's first mechanism is "a materialized ancestor path, so the tree
-- question becomes a range question". That is what `subtree` below is.

create extension if not exists btree_gist;

-- Pre-order interval over the resource tree.
--
-- Each node gets [pre, pre + subtree_size - 1] in depth-first order, so:
--   Unit 203  [1,3]
--   └ Room 101 [2,3]
--     └ Bed A  [3,3]
-- An ancestor's range CONTAINS every descendant's, and siblings are disjoint.
-- Ancestry therefore becomes `&&` — which, unlike `@>`, is commutative and so
-- can be used in an EXCLUDE constraint.
alter table rentable_resources add column subtree int4range;

/**
 * Recompute every tree's intervals.
 *
 * Called after any resource is added, moved, or removed. Cheap at pilot scale
 * and correct by construction, which beats incremental maintenance that can
 * drift — a wrong interval here would silently stop the constraint from seeing
 * a conflict.
 */
create or replace function rebuild_resource_paths() returns void
language plpgsql as $$
begin
  with recursive walk as (
    select id, root_id, parent_id, array[id] as path
      from rentable_resources
     where parent_id is null
    union all
    select r.id, r.root_id, r.parent_id, w.path || r.id
      from rentable_resources r
      join walk w on r.parent_id = w.id
  ),
  ordered as (
    -- Ordering by the path array is a depth-first order: a parent's path is a
    -- prefix of its children's, so it always sorts immediately before them.
    select id, root_id, path,
           row_number() over (partition by root_id order by path) as pre
      from walk
  ),
  sized as (
    select o.id,
           o.pre,
           (select count(*)
              from ordered d
             where d.root_id = o.root_id
               and d.path[1:array_length(o.path, 1)] = o.path) as n
      from ordered o
  )
  update rentable_resources r
     set subtree = int4range(s.pre::int, (s.pre + s.n - 1)::int, '[]')
    from sized s
   where s.id = r.id;
end $$;

select rebuild_resource_paths();
alter table rentable_resources alter column subtree set not null;

-- One timeline per resource. Long-term state and the nightly calendar are
-- projections of this table, never a second source of truth (U-01).
create table occupancies (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  resource_id     uuid not null,
  -- Denormalised from the resource so the constraint has everything it needs
  -- on the row itself. Rebuilt alongside the resource paths.
  root_id         uuid not null,
  subtree         int4range not null,
  -- Half-open [starts_on, ends_on) throughout, so a checkout and a check-in on
  -- the same day do not collide.
  during          daterange not null,
  kind            text not null check (kind in ('BOOKING','LEASE','BLOCK')),
  state           text not null
                  check (state in ('HELD','COMMITTED','RELEASED','EXPIRED','CANCELLED')),
  -- Set for HELD only. A hold that outlives this is not occupancy any more.
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  foreign key (resource_id, organization_id)
    references rentable_resources(id, organization_id),
  constraint occupancy_dates_ordered check (not isempty(during)),
  -- A hold must have an expiry. Other states MAY keep one: an EXPIRED row
  -- retains the expiry that caused it, which is history worth having when
  -- someone asks why the nights went back.
  constraint held_has_expiry check (state <> 'HELD' or expires_at is not null),

  -- **The actual guarantee** (ADR-0005).
  --
  -- Not a convention the application agrees to follow: a future service,
  -- script, or migration writing to this table is bound by it too. `root_id`
  -- scopes the comparison to one tree, since intervals are only meaningful
  -- within the tree that numbered them.
  constraint occupancy_no_overlap exclude using gist (
    root_id with =,
    subtree with &&,
    during with &&
  ) where (state in ('HELD','COMMITTED'))
);

create index occupancies_resource on occupancies (resource_id, state);
create index occupancies_expiry on occupancies (expires_at) where state = 'HELD';

alter table occupancies enable row level security;

create policy org_isolation on occupancies using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);

-- The nightly calendar (ADR-0004). A projection, and it says so: if it ever
-- disagrees with `occupancies`, the timeline is right and this gets rebuilt.
create table resource_night_status (
  organization_id uuid not null references organizations(id),
  resource_id     uuid not null,
  night           date not null,
  status          text not null
                  check (status in ('OPEN','HELD','BOOKED','LEASED','BLOCKED')),
  primary key (resource_id, night),
  foreign key (resource_id, organization_id)
    references rentable_resources(id, organization_id)
);

create index night_status_lookup on resource_night_status (resource_id, night);

alter table resource_night_status enable row level security;

create policy org_isolation on resource_night_status using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);

-- The calendar is public for a published listing, like the rest of the
-- marketplace read.
create policy night_status_public_read on resource_night_status for select using (
  exists (
    select 1 from listings l
     where l.resource_id = resource_night_status.resource_id
       and l.state = 'PUBLISHED'
  )
);

grant select, insert, update on occupancies to rental_app;
grant select, insert, update, delete on resource_night_status to rental_app;

-- The calendar is public for inventory that is on the market.
--
-- A booking calendar reveals which nights are taken — that is its whole job —
-- so this exposes exactly what a customer already sees, and only for resources
-- backing a published listing. Unpublish, and the timeline goes dark again.
--
-- Scoped to the same ancestor path the constraint uses, because a customer
-- asking about a bunk must see the lease on the room above it.
create policy occupancy_public_read on occupancies for select using (
  exists (
    select 1
      from rentable_resources r
      join listings l on l.resource_id = r.id and l.state = 'PUBLISHED'
     where r.root_id = occupancies.root_id
       and r.subtree && occupancies.subtree
  )
);
