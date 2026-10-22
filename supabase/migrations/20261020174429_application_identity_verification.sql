create table application_drafts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id),
  resource_id uuid not null references rentable_resources(id),
  desired_move_in date not null,
  desired_term_months int not null check (desired_term_months between 1 and 60),
  occupants int not null check (occupants between 1 and 8),
  message text not null default '' check (length(message) <= 2000),
  application_id uuid unique references applications(id),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create unique index application_drafts_open on application_drafts(user_id, resource_id) where application_id is null;
create index application_drafts_resource on application_drafts(resource_id);

create table identity_verification_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id),
  draft_id uuid not null,
  version int not null default 0,
  status text not null check (status in ('CONSENT_REQUIRED','FRONT_READY','OCR_PROCESSING','OCR_REVIEW',
    'DETAILS_CONFIRMED','CHALLENGE_ACTIVE','VERIFYING','VERIFIED','FAILED','EXPIRED','CANCELLED')),
  expires_at timestamptz not null default now() + interval '30 minutes',
  data jsonb not null default '{}',
  foreign key (draft_id, user_id) references application_drafts(id, user_id)
);
create unique index identity_verification_active_draft on identity_verification_sessions(draft_id)
  where status not in ('EXPIRED','CANCELLED');
create index identity_verification_draft on identity_verification_sessions(draft_id);
create index identity_verification_user on identity_verification_sessions(user_id);
create index identity_verification_expiry on identity_verification_sessions(expires_at);

alter table application_drafts enable row level security;
alter table identity_verification_sessions enable row level security;
create policy own_draft on application_drafts to rental_app
  using (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
create policy own_verification on identity_verification_sessions to rental_app
  using (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
grant select, insert, update on application_drafts, identity_verification_sessions to rental_app;
revoke all on application_drafts, identity_verification_sessions from anon, authenticated;

create table identity_capture_limits (
  user_id uuid primary key references user_profiles(id),
  window_start timestamptz not null,
  attempts int not null
);
alter table identity_capture_limits enable row level security;
create policy own_capture_limit on identity_capture_limits to rental_app
  using (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
grant select, insert, update on identity_capture_limits to rental_app;
revoke all on identity_capture_limits from anon, authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('identity-evidence', 'identity-evidence', false, 8388608, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg'];
create table identity_evidence_uploads (
  path text primary key,
  user_id uuid not null references user_profiles(id),
  expires_at timestamptz not null
);
create index identity_evidence_expiry on identity_evidence_uploads(expires_at);
create index identity_evidence_user on identity_evidence_uploads(user_id);
alter table identity_evidence_uploads enable row level security;
create policy own_evidence on identity_evidence_uploads to rental_app
  using (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
create policy expired_evidence_cleanup on identity_evidence_uploads for select to rental_app
  using (expires_at <= now() and current_setting('app.identity_cleanup', true) = 'true');
create policy expired_session_cleanup on identity_verification_sessions to rental_app
  using (expires_at <= now() and current_setting('app.identity_cleanup', true) = 'true')
  with check (expires_at <= now() and current_setting('app.identity_cleanup', true) = 'true');
grant select, insert, delete on identity_evidence_uploads to rental_app;
revoke all on identity_evidence_uploads from anon, authenticated;
