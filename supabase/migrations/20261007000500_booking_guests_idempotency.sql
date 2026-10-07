alter table occupancies
  add column if not exists guests int check (guests is null or guests between 1 and 50),
  add column if not exists client_ref uuid,
  add column if not exists note text;

create unique index if not exists occupancies_client_ref
  on occupancies (held_by, client_ref)
  where client_ref is not null;

create index if not exists occupancies_org_bookings
  on occupancies (organization_id, kind, created_at desc);

alter table stays
  add column if not exists updated_at timestamptz not null default now();
