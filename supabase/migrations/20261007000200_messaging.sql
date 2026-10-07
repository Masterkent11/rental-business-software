create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from organization_members m
     where m.organization_id = org
       and m.user_id = auth.uid()
       and m.revoked_at is null
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

create table if not exists conversations (
  id                     uuid primary key default uuid_generate_v4(),
  organization_id        uuid not null references organizations(id),
  listing_id             uuid not null references listings(id),
  customer_id            uuid not null references user_profiles(id),
  occupancy_id           uuid references occupancies(id),
  last_message_at        timestamptz,
  last_message_preview   text not null default '',
  last_sender_role       text check (last_sender_role is null or last_sender_role in ('CUSTOMER','OWNER')),
  customer_last_read_at  timestamptz,
  owner_last_read_at     timestamptz,
  created_at             timestamptz not null default now(),
  unique (listing_id, customer_id),
  unique (id, organization_id)
);

create index if not exists conversations_org on conversations (organization_id, last_message_at desc nulls last);
create index if not exists conversations_customer on conversations (customer_id, last_message_at desc nulls last);

create table if not exists messages (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null,
  conversation_id  uuid not null,
  sender_id        uuid not null references user_profiles(id),
  sender_role      text not null check (sender_role in ('CUSTOMER','OWNER')),
  body             text not null check (char_length(btrim(body)) between 1 and 4000),
  client_id        uuid not null,
  created_at       timestamptz not null default clock_timestamp(),
  foreign key (conversation_id, organization_id)
    references conversations(id, organization_id) on delete cascade,
  unique (conversation_id, client_id)
);

create index if not exists messages_conversation on messages (conversation_id, created_at desc);
create index if not exists messages_org on messages (organization_id, created_at desc);

alter table conversations enable row level security;
alter table messages      enable row level security;

create policy org_isolation on conversations using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
create policy own_conversation on conversations using (
  customer_id = nullif(current_setting('app.user_id', true), '')::uuid
);
create policy org_isolation on messages using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
create policy own_messages on messages using (
  exists (
    select 1 from conversations c
     where c.id = messages.conversation_id
       and c.customer_id = nullif(current_setting('app.user_id', true), '')::uuid
  )
);

create policy participant_realtime_read on conversations
  for select to authenticated
  using (customer_id = auth.uid() or public.is_org_member(organization_id));

create policy participant_realtime_read on messages
  for select to authenticated
  using (
    exists (
      select 1 from conversations c
       where c.id = messages.conversation_id
         and (c.customer_id = auth.uid() or public.is_org_member(c.organization_id))
    )
  );

grant select, insert, update on conversations to rental_app;
grant select, insert on messages to rental_app;

create table if not exists notifications (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references user_profiles(id) on delete cascade,
  organization_id  uuid references organizations(id),
  kind             text not null check (kind in (
                     'BOOKING_CONFIRMED','BOOKING_RECEIVED','BOOKING_UPDATED',
                     'MESSAGE_RECEIVED','APPLICATION_RECEIVED','APPLICATION_DECIDED')),
  title            text not null,
  body             text not null default '',
  link             text,
  read_at          timestamptz,
  created_at       timestamptz not null default now(),
  constraint notification_has_audience check (user_id is not null or organization_id is not null)
);

create index if not exists notifications_user on notifications (user_id, created_at desc) where user_id is not null;
create index if not exists notifications_org on notifications (organization_id, created_at desc) where user_id is null;

alter table notifications enable row level security;

create policy own_notification on notifications using (
  user_id = nullif(current_setting('app.user_id', true), '')::uuid
);
create policy org_notification on notifications using (
  user_id is null
  and organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
create policy audience_realtime_read on notifications
  for select to authenticated
  using (
    user_id = auth.uid()
    or (user_id is null and public.is_org_member(organization_id))
  );

grant select, insert, update on notifications to rental_app;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table conversations;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table messages;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table notifications;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
