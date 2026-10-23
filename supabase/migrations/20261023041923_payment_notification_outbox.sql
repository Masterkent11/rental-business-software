begin;
create table public.payment_notification_outbox (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid not null references public.payments(id),
  organization_id uuid not null references public.organizations(id),
  user_id uuid references public.user_profiles(id) on delete cascade,
  kind text not null check (kind in ('BOOKING_RECEIVED','BOOKING_CONFIRMED')),
  title text not null,
  body text not null,
  link text,
  created_at timestamptz not null default now(),
  unique (payment_id, kind)
);
alter table public.payment_notification_outbox enable row level security;
create policy enqueue_owned_payment_notification on public.payment_notification_outbox
for insert to rental_app with check (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  and exists (select 1 from public.payments p where p.id = payment_id and p.organization_id = payment_notification_outbox.organization_id)
);
create policy deliver_payment_notifications on public.payment_notification_outbox
for select to rental_app using (current_setting('app.notification_delivery', true) = 'true');
create policy lock_payment_notifications on public.payment_notification_outbox
for update to rental_app using (current_setting('app.notification_delivery', true) = 'true')
with check (current_setting('app.notification_delivery', true) = 'true');
create policy acknowledge_payment_notifications on public.payment_notification_outbox
for delete to rental_app using (current_setting('app.notification_delivery', true) = 'true');
create index payment_notification_outbox_pending on public.payment_notification_outbox (created_at, id);
revoke all on public.payment_notification_outbox from public, anon, authenticated;
grant select, insert, delete on public.payment_notification_outbox to rental_app;
grant update (id) on public.payment_notification_outbox to rental_app;
commit;
