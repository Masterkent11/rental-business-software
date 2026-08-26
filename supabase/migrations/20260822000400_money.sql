-- Sprint 4 — Money.
--
-- Four things, not one (money-model.md): an invoice is a claim, a payment is
-- money, a deposit is a liability, and the ledger is what remains true after
-- all three have been argued about.
--
-- This sprint builds the short-term path only: a prepaid stay raises no
-- invoice. Invoices and deposits arrive with the long-term path in Sprint 5.

-- Idempotency for provider callbacks.
--
-- Providers retry, and a double-applied payment is a refund conversation
-- (ADR-0008). The unique constraint is the mechanism: a replayed event loses
-- the insert and the handler stops.
create table provider_events (
  provider_event_id text primary key,
  provider          text not null,
  received_at       timestamptz not null default now(),
  payload           jsonb not null
);

create table payments (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  occupancy_id    uuid not null references occupancies(id),
  -- Integer centavos, never negative. Direction is expressed by entry type in
  -- the ledger, never by sign.
  amount_centavos bigint not null check (amount_centavos > 0),
  currency        text not null default 'PHP' check (currency = 'PHP'),
  -- I-08: payment origin is immutable, and enforced by which code path exists
  -- at all — offline recordings never touch the payment gateway (D-09).
  origin          text not null check (origin in ('ONLINE','OFFLINE_RECORDED')),
  state           text not null default 'PENDING'
                  check (state in ('PENDING','SUCCEEDED','FAILED','REFUNDED')),
  -- The provider's own reference. Null for offline recordings, which have no
  -- provider side — which is why reconciliation looks only at ONLINE entries.
  provider_ref    text,
  provider_event_id text references provider_events(provider_event_id),
  -- "Cash handed over Friday and entered Monday is two different facts, and
  -- the gap is exactly what audit looks at."
  received_at     timestamptz,
  recorded_at     timestamptz not null default now(),
  -- Who says so. The staff user for an offline recording; null when the
  -- provider is the actor.
  recorded_by     uuid references user_profiles(id),
  constraint online_has_no_recorder
    check (origin = 'OFFLINE_RECORDED' or recorded_by is null)
);

create index payments_occupancy on payments (occupancy_id);
create unique index payments_provider_ref
  on payments (provider_ref) where provider_ref is not null;

-- A guest's stay. Created when a booking is actually paid for, never before.
create table stays (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  occupancy_id    uuid not null unique references occupancies(id),
  user_id         uuid references user_profiles(id),
  state           text not null default 'CONFIRMED'
                  check (state in ('CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED')),
  created_at      timestamptz not null default now()
);

create index stays_user on stays (user_id, created_at desc);

-- The append-only record for an organization.
create table ledger_entries (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  entry_type      text not null check (entry_type in (
                    'INVOICE_ISSUED','INVOICE_VOIDED','PAYMENT_RECEIVED',
                    'PAYMENT_CORRECTED','REFUND_ISSUED','DEPOSIT_HELD',
                    'DEPOSIT_APPLIED','DEPOSIT_RETURNED','BOOKING_PREPAID')),
  amount_centavos bigint not null check (amount_centavos >= 0),
  currency        text not null default 'PHP' check (currency = 'PHP'),
  -- Only ONLINE entries are reconcilable: offline entries have no provider
  -- side, and a reconciliation that never balances is one nobody reads.
  origin          text not null check (origin in ('ONLINE','OFFLINE_RECORDED')),
  -- "Who says so" is a column, not an inference.
  actor_type      text not null check (actor_type in ('PROVIDER','STAFF','SYSTEM')),
  actor_id        text,
  -- Every entry names its cause.
  cause_type      text not null
                  check (cause_type in ('PAYMENT','INVOICE','BOOKING','DEPOSIT_BALANCE')),
  cause_id        uuid not null,
  -- The correction this entry opposes, when it is one.
  corrects_id     uuid references ledger_entries(id),
  occurred_at     timestamptz not null,
  recorded_at     timestamptz not null default now()
);

create index ledger_org on ledger_entries (organization_id, occurred_at desc);
create index ledger_cause on ledger_entries (cause_type, cause_id);
create index ledger_reconcilable
  on ledger_entries (organization_id, occurred_at) where origin = 'ONLINE';

/**
 * The ledger is append-only, and this is what makes that true.
 *
 * Not a convention, not a code review rule, and not merely a missing GRANT:
 * a trigger binds the table owner and a superuser at a psql prompt too.
 * Corrections are new, opposing entries referencing the original (D-08) — a
 * product requirement, not an implementation preference.
 */
create or replace function ledger_is_append_only() returns trigger
language plpgsql as $$
begin
  raise exception
    'The ledger is append-only. Record an opposing entry instead of changing %.',
    tg_op;
end $$;

create trigger ledger_no_update before update on ledger_entries
  for each row execute function ledger_is_append_only();
create trigger ledger_no_delete before delete on ledger_entries
  for each row execute function ledger_is_append_only();
create trigger ledger_no_truncate before truncate on ledger_entries
  for each statement execute function ledger_is_append_only();

alter table payments        enable row level security;
alter table stays           enable row level security;
alter table ledger_entries  enable row level security;

create policy org_isolation on payments using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
create policy org_isolation on ledger_entries using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
-- A stay is the guest's as well as the organization's: a customer must be able
-- to see the booking they paid for.
create policy org_isolation on stays using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
create policy own_stay on stays for select using (
  user_id = nullif(current_setting('app.user_id', true), '')::uuid
);

grant select, insert, update on payments to rental_app;
grant select, insert, update on stays to rental_app;
grant select, insert on provider_events to rental_app;
-- **No UPDATE. No DELETE.** The grant says the same thing the trigger enforces,
-- so the intent is visible without reading trigger definitions.
grant select, insert on ledger_entries to rental_app;

/**
 * A webhook has no organization context.
 *
 * It is a provider calling us about one payment, identified by a reference we
 * issued. There is no membership to scope by and no user to attribute it to, so
 * the alternative would be letting the webhook path bypass RLS entirely — which
 * would make the payments table unprotected for the one code path that writes
 * money.
 *
 * Instead the handler names the single row it is allowed to see. `app.provider_ref`
 * is set transaction-locally from the verified callback, and this policy grants
 * exactly that row: a capability, not a hole.
 */
create policy payment_by_provider_ref on payments for select using (
  provider_ref is not null
  and provider_ref = nullif(current_setting('app.provider_ref', true), '')
);

/**
 * A guest may see what they paid.
 *
 * `payments` is organization-isolated and a guest is not a member of the
 * organization they stayed with, so without this the receipt renders the stay
 * correctly and the amount as zero — a screen that is confidently wrong about
 * money, which is worse than one that fails.
 *
 * Scoped through the stay, so it grants exactly the payments behind bookings
 * this user owns.
 */
create policy own_payment on payments for select using (
  exists (
    select 1 from stays s
     where s.occupancy_id = payments.occupancy_id
       and s.user_id = nullif(current_setting('app.user_id', true), '')::uuid
  )
);
