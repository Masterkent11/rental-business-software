create table if not exists content_pages (
  slug                 text not null,
  version              integer not null,
  kind                 text not null,
  title                text not null,
  summary              text not null default '',
  body                 text not null,
  status               text not null default 'DRAFT',
  requires_acceptance  boolean not null default false,
  effective_on         date,
  published_at         timestamptz,
  created_at           timestamptz not null default now(),
  primary key (slug, version),
  constraint content_pages_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint content_pages_version_positive check (version > 0),
  constraint content_pages_kind_check check (kind in ('LEGAL', 'HELP')),
  constraint content_pages_status_check check (status in ('DRAFT', 'APPROVED', 'RETIRED'))
);

alter table content_pages enable row level security;

drop policy if exists content_public_read on content_pages;
create policy content_public_read on content_pages for select to rental_app using (status <> 'RETIRED');

revoke all on content_pages from public, anon, authenticated;
grant select on content_pages to rental_app;

create table if not exists policy_acceptances (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references user_profiles(id) on delete cascade,
  slug         text not null,
  version      integer not null,
  context      text not null,
  related_id   uuid,
  accepted_at  timestamptz not null default now(),
  foreign key (slug, version) references content_pages(slug, version),
  constraint policy_acceptances_context_check check (
    context in ('SIGN_UP', 'BOOKING', 'INQUIRY', 'VIEWING', 'POLICY_UPDATE')
  )
);

create unique index if not exists policy_acceptances_once
  on policy_acceptances (user_id, slug, version, context, coalesce(related_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists policy_acceptances_user on policy_acceptances (user_id, accepted_at desc);

alter table policy_acceptances enable row level security;

drop policy if exists own_policy_acceptances on policy_acceptances;
create policy own_policy_acceptances on policy_acceptances to rental_app
  using (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

revoke all on policy_acceptances from public, anon, authenticated;
grant select, insert on policy_acceptances to rental_app;

create table if not exists support_requests (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references user_profiles(id) on delete set null,
  email       text not null,
  topic       text not null,
  message     text not null,
  listing_id  uuid references listings(id) on delete set null,
  status      text not null default 'OPEN',
  client_ref  uuid not null,
  created_at  timestamptz not null default now(),
  constraint support_requests_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint support_requests_topic_check check (
    topic in ('ACCOUNT', 'BOOKING', 'PAYMENT', 'LISTING_REPORT', 'INQUIRY_VIEWING', 'PRIVACY', 'OTHER')
  ),
  constraint support_requests_message_length check (char_length(btrim(message)) between 10 and 4000),
  constraint support_requests_status_check check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
  unique (client_ref)
);

create index if not exists support_requests_user on support_requests (user_id, created_at desc) where user_id is not null;
create index if not exists support_requests_open on support_requests (created_at desc) where status = 'OPEN';

alter table support_requests enable row level security;

drop policy if exists support_request_submit on support_requests;
create policy support_request_submit on support_requests for insert to rental_app with check (
  user_id is null or user_id = nullif(current_setting('app.user_id', true), '')::uuid
);

drop policy if exists own_support_requests on support_requests;
create policy own_support_requests on support_requests for select to rental_app using (
  user_id is not null and user_id = nullif(current_setting('app.user_id', true), '')::uuid
);

revoke all on support_requests from public, anon, authenticated;
grant select, insert on support_requests to rental_app;
