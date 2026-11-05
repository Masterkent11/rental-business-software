create table app_private.facebook_page_attempts (
  agent_id uuid primary key references public.agent_profiles(id) on delete cascade,
  state_digest text not null check (length(state_digest) = 64),
  expires_at timestamptz not null,
  consumed boolean not null default false,
  pages jsonb not null default '[]'::jsonb check (jsonb_typeof(pages) = 'array')
);

create table app_private.facebook_page_connections (
  agent_id uuid primary key references public.agent_profiles(id) on delete cascade,
  page_id text not null check (page_id ~ '^[0-9]{1,64}$'),
  page_name text not null check (length(page_name) between 1 and 255),
  encrypted_token text not null,
  connected_at timestamptz not null default now()
);

create table app_private.facebook_page_connection_events (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  page_id text not null,
  action text not null check (action in ('CONNECTED', 'DISCONNECTED')),
  occurred_at timestamptz not null default now()
);

create index facebook_page_connection_events_agent_time
  on app_private.facebook_page_connection_events (agent_id, occurred_at desc);

alter table app_private.facebook_page_attempts enable row level security;
alter table app_private.facebook_page_attempts force row level security;
alter table app_private.facebook_page_connections enable row level security;
alter table app_private.facebook_page_connections force row level security;
alter table app_private.facebook_page_connection_events enable row level security;
alter table app_private.facebook_page_connection_events force row level security;

revoke all on app_private.facebook_page_attempts, app_private.facebook_page_connections,
  app_private.facebook_page_connection_events from public, anon, authenticated, service_role;
grant select, insert, update, delete on app_private.facebook_page_attempts,
  app_private.facebook_page_connections to rental_app;
grant insert on app_private.facebook_page_connection_events to rental_app;

create policy facebook_attempt_agent on app_private.facebook_page_attempts
  for all to rental_app
  using (agent_id = (select app_private.current_app_agent()))
  with check (agent_id = (select app_private.current_app_agent()));

create policy facebook_connection_agent on app_private.facebook_page_connections
  for all to rental_app
  using (agent_id = (select app_private.current_app_agent()))
  with check (agent_id = (select app_private.current_app_agent()));

create policy facebook_event_agent on app_private.facebook_page_connection_events
  for insert to rental_app with check (agent_id = (select app_private.current_app_agent()));
