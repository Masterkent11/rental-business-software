alter table conversations add column if not exists agent_id uuid references agent_profiles(id);
alter table conversations add column if not exists agent_last_read_at timestamptz;
alter table conversations drop constraint if exists conversations_last_sender_role_check;
alter table conversations add constraint conversations_last_sender_role_check check (
  last_sender_role is null or last_sender_role in ('CUSTOMER', 'OWNER', 'AGENT')
);
create index if not exists conversations_agent on conversations (agent_id, last_message_at desc nulls last)
  where agent_id is not null;

alter table messages drop constraint if exists messages_sender_role_check;
alter table messages add constraint messages_sender_role_check check (sender_role in ('CUSTOMER', 'OWNER', 'AGENT'));

drop policy if exists agent_conversation on conversations;
create policy agent_conversation on conversations to rental_app using (
  agent_id is not null and agent_id = app_private.current_app_agent()
);

drop policy if exists agent_messages on messages;
create policy agent_messages on messages to rental_app using (
  exists (
    select 1 from conversations c
     where c.id = messages.conversation_id
       and c.agent_id is not null
       and c.agent_id = app_private.current_app_agent()
  )
);

create table if not exists inquiries (
  id                     uuid primary key default uuid_generate_v4(),
  organization_id        uuid not null references organizations(id),
  listing_id             uuid not null references listings(id),
  customer_id            uuid not null references user_profiles(id),
  agent_id               uuid references agent_profiles(id),
  conversation_id        uuid not null,
  status                 text not null default 'NEW',
  message                text not null,
  questions              text[] not null default '{}',
  buyer_budget_centavos  bigint,
  client_ref             uuid not null,
  lost_reason            text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  status_changed_at      timestamptz not null default now(),
  first_response_at      timestamptz,
  constraint inquiries_status_check check (
    status in ('NEW', 'CONTACTED', 'QUALIFIED', 'VIEWING_SCHEDULED', 'NEGOTIATING', 'CLOSED', 'LOST')
  ),
  constraint inquiries_message_length check (char_length(btrim(message)) between 1 and 2000),
  constraint inquiries_questions_size check (cardinality(questions) <= 8),
  constraint inquiries_budget_positive check (buyer_budget_centavos is null or buyer_budget_centavos > 0),
  constraint inquiries_lost_reason_length check (lost_reason is null or char_length(lost_reason) <= 500),
  foreign key (conversation_id, organization_id) references conversations(id, organization_id),
  unique (customer_id, client_ref),
  unique (id, organization_id)
);

create unique index if not exists inquiries_open_per_customer
  on inquiries (listing_id, customer_id) where status not in ('CLOSED', 'LOST');
create index if not exists inquiries_org on inquiries (organization_id, created_at desc);
create index if not exists inquiries_agent on inquiries (agent_id, status, created_at desc) where agent_id is not null;
create index if not exists inquiries_customer on inquiries (customer_id, created_at desc);

alter table inquiries enable row level security;

drop policy if exists org_isolation on inquiries;
create policy org_isolation on inquiries using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
drop policy if exists own_inquiry on inquiries;
create policy own_inquiry on inquiries using (
  customer_id = nullif(current_setting('app.user_id', true), '')::uuid
);
drop policy if exists agent_inquiry on inquiries;
create policy agent_inquiry on inquiries to rental_app using (
  agent_id is not null and agent_id = app_private.current_app_agent()
);

create table if not exists viewings (
  id                  uuid primary key default uuid_generate_v4(),
  organization_id     uuid not null references organizations(id),
  listing_id          uuid not null references listings(id),
  customer_id         uuid not null references user_profiles(id),
  agent_id            uuid references agent_profiles(id),
  inquiry_id          uuid,
  conversation_id     uuid not null,
  scheduled_at        timestamptz not null,
  duration_minutes    integer not null default 60,
  status              text not null default 'REQUESTED',
  customer_note       text not null default '',
  partner_note        text not null default '',
  client_ref          uuid not null,
  confirmed_at        timestamptz,
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  cancelled_by_role   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint viewings_status_check check (
    status in ('REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'COMPLETED', 'CANCELLED')
  ),
  constraint viewings_duration_check check (duration_minutes between 15 and 240),
  constraint viewings_customer_note_length check (char_length(customer_note) <= 1000),
  constraint viewings_partner_note_length check (char_length(partner_note) <= 1000),
  constraint viewings_cancelled_role_check check (
    cancelled_by_role is null or cancelled_by_role in ('CUSTOMER', 'OWNER', 'AGENT')
  ),
  constraint viewings_cancelled_consistent check ((status = 'CANCELLED') = (cancelled_at is not null)),
  foreign key (inquiry_id, organization_id) references inquiries(id, organization_id),
  foreign key (conversation_id, organization_id) references conversations(id, organization_id),
  unique (customer_id, client_ref)
);

create unique index if not exists viewings_slot_taken
  on viewings (listing_id, scheduled_at) where status in ('REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED');
create unique index if not exists viewings_one_active_per_customer
  on viewings (listing_id, customer_id) where status in ('REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED');
create index if not exists viewings_org on viewings (organization_id, scheduled_at);
create index if not exists viewings_agent on viewings (agent_id, scheduled_at) where agent_id is not null;
create index if not exists viewings_customer on viewings (customer_id, scheduled_at desc);

alter table viewings enable row level security;

drop policy if exists org_isolation on viewings;
create policy org_isolation on viewings using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
drop policy if exists own_viewing on viewings;
create policy own_viewing on viewings using (
  customer_id = nullif(current_setting('app.user_id', true), '')::uuid
);
drop policy if exists agent_viewing on viewings;
create policy agent_viewing on viewings to rental_app using (
  agent_id is not null and agent_id = app_private.current_app_agent()
);

create table if not exists agent_tasks (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid not null references agent_profiles(id) on delete cascade,
  inquiry_id  uuid references inquiries(id) on delete set null,
  title       text not null,
  due_at      timestamptz not null,
  done_at     timestamptz,
  created_at  timestamptz not null default now(),
  constraint agent_tasks_title_length check (char_length(btrim(title)) between 1 and 200)
);

create index if not exists agent_tasks_open on agent_tasks (agent_id, due_at) where done_at is null;

alter table agent_tasks enable row level security;

drop policy if exists agent_own_task on agent_tasks;
create policy agent_own_task on agent_tasks to rental_app using (agent_id = app_private.current_app_agent());

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
  );
$$;

create or replace function app_private.viewing_taken_slots(target uuid, from_at timestamptz, to_at timestamptz)
returns setof timestamptz
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select v.scheduled_at from public.viewings v
   where v.listing_id = target
     and v.status in ('REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED')
     and v.scheduled_at >= from_at
     and v.scheduled_at < to_at;
$$;

create or replace function app_private.agent_response_samples(target uuid, since timestamptz)
returns table (created_at timestamptz, first_response_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select i.created_at, i.first_response_at from public.inquiries i
   where i.agent_id = target and i.created_at >= since;
$$;

revoke all on function app_private.agent_response_samples(uuid, timestamptz) from public, anon, authenticated;
grant execute on function app_private.agent_response_samples(uuid, timestamptz) to rental_app;

revoke all on function app_private.viewing_taken_slots(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function app_private.viewing_taken_slots(uuid, timestamptz, timestamptz) to rental_app;

revoke all on function app_private.agent_has_customer(uuid) from public, anon, authenticated;
grant execute on function app_private.agent_has_customer(uuid) to rental_app;

drop policy if exists agent_customer_read on user_profiles;
create policy agent_customer_read on user_profiles for select to rental_app using (
  app_private.agent_has_customer(id)
);

alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in (
  'BOOKING_CONFIRMED', 'BOOKING_RECEIVED', 'BOOKING_UPDATED',
  'MESSAGE_RECEIVED', 'APPLICATION_RECEIVED', 'APPLICATION_DECIDED',
  'INQUIRY_RECEIVED', 'INQUIRY_UPDATED',
  'VIEWING_REQUESTED', 'VIEWING_UPDATED',
  'REPRESENTATION_INVITED', 'REPRESENTATION_UPDATED'
));

drop policy if exists participant_realtime_read on conversations;
create policy participant_realtime_read on conversations
  for select to authenticated
  using (
    customer_id = auth.uid()
    or app_private.is_org_member(organization_id)
    or (agent_id is not null and agent_id = app_private.current_auth_agent())
  );

drop policy if exists participant_realtime_read on messages;
create policy participant_realtime_read on messages
  for select to authenticated
  using (
    exists (
      select 1 from conversations c
       where c.id = messages.conversation_id
         and (
           c.customer_id = auth.uid()
           or app_private.is_org_member(c.organization_id)
           or (c.agent_id is not null and c.agent_id = app_private.current_auth_agent())
         )
    )
  );

drop policy if exists participant_realtime_read on inquiries;
create policy participant_realtime_read on inquiries
  for select to authenticated
  using (
    customer_id = auth.uid()
    or app_private.is_org_member(organization_id)
    or (agent_id is not null and agent_id = app_private.current_auth_agent())
  );

drop policy if exists participant_realtime_read on viewings;
create policy participant_realtime_read on viewings
  for select to authenticated
  using (
    customer_id = auth.uid()
    or app_private.is_org_member(organization_id)
    or (agent_id is not null and agent_id = app_private.current_auth_agent())
  );

revoke all on inquiries from public, anon, authenticated;
revoke all on viewings from public, anon, authenticated;
revoke all on agent_tasks from public, anon, authenticated;
grant select on inquiries to authenticated;
grant select on viewings to authenticated;
grant select, insert, update on inquiries to rental_app;
grant select, insert, update on viewings to rental_app;
grant select, insert, update, delete on agent_tasks to rental_app;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table inquiries;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table viewings;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
