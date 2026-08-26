-- Invoices: the claim half of the money model.
--
-- money-model.md is explicit that four things are kept apart — an invoice is a
-- claim, a payment is money, a deposit is a held balance, the ledger is what
-- remains true. Sprints 4 and 5 built payments, deposits-by-another-name, and
-- the ledger. The claim was never built, which is why the headline pilot
-- signal ("an owner answers 'who owes me money this month?'") had no query
-- behind it: money-model.md#what-who-owes-me-money-actually-queries describes
-- it as a query over invoices, and there were none.
--
-- Long-term only. A prepaid Stay raises no invoice — the booking is paid before
-- it exists, so a claim would be issued and settled in the same instant.

begin;

-- ---------------------------------------------------------------- invoices --

create table invoices (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  occupancy_id    uuid not null references occupancies(id),
  -- Who the claim is against. Nullable only because an occupancy may be held
  -- for someone who has not finished creating an account.
  tenant_id       uuid references user_profiles(id),

  -- Per-organization and gap-free: owners are asked about gaps by their
  -- accountants. Allocated by trigger under a per-organization advisory lock
  -- rather than a sequence, because a sequence loses numbers on rollback.
  number          integer not null,

  -- The period the claim covers, half-open like every other range here.
  period          daterange not null,
  due_on          date not null,

  total_centavos       bigint not null check (total_centavos >= 0),
  -- Maintained by trigger from payment_applications. Stored rather than
  -- derived so that I-04 can be a check constraint the database enforces,
  -- not a rule the application promises to have run.
  amount_paid_centavos bigint not null default 0
                       check (amount_paid_centavos >= 0),
  currency        text not null default 'PHP' check (currency = 'PHP'),

  state           text not null default 'DRAFT'
                  check (state in ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','VOIDED')),
  void_reason     text,

  issued_at       timestamptz,
  created_at      timestamptz not null default now(),

  -- I-04: an invoice is never overpaid. Money beyond the total is an unapplied
  -- credit against the lease, not an overpaid invoice.
  constraint invoice_not_overpaid
    check (amount_paid_centavos <= total_centavos),

  constraint invoice_number_per_organization
    unique (organization_id, number),

  -- A void must say why. "Voided, reason unknown" is not an answer an owner
  -- can give their accountant a year later.
  constraint void_states_reason
    check (state <> 'VOIDED' or void_reason is not null),

  -- An issued claim has an issue date; a draft has not been claimed yet.
  constraint issued_has_a_date
    check ((state = 'DRAFT') = (issued_at is null))
);

create index invoices_by_organization on invoices (organization_id, state);
create index invoices_by_occupancy on invoices (occupancy_id);
create index invoices_by_tenant on invoices (tenant_id) where tenant_id is not null;
create index invoices_outstanding on invoices (organization_id, due_on)
  where state in ('ISSUED','PARTIALLY_PAID','OVERDUE');

-- ----------------------------------------------------------- invoice lines --

-- Line items exist from V1 even though most invoices have exactly one: the
-- lease-start invoice needs several (first month, advance, deposit).
create table invoice_lines (
  id              uuid primary key default uuid_generate_v4(),
  invoice_id      uuid not null references invoices(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  kind            text not null check (kind in (
                    'RENT','ADVANCE','DEPOSIT','UTILITY','PENALTY','OTHER')),
  description     text not null,
  amount_centavos bigint not null check (amount_centavos >= 0),
  position        integer not null,

  unique (invoice_id, position)
);

create index invoice_lines_by_invoice on invoice_lines (invoice_id);

-- ----------------------------------------------------- payment application --

-- Application is N:M and is its own record, because "which ₱4,000 settled
-- what" is a question owners genuinely ask. One payment may settle two
-- invoices; one invoice may take four partial payments.
create table payment_applications (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  payment_id      uuid not null references payments(id),
  invoice_id      uuid not null references invoices(id),
  amount_centavos bigint not null check (amount_centavos > 0),
  applied_at      timestamptz not null default now(),

  -- The same payment is never applied to the same invoice twice. A second
  -- partial settlement of the same claim by the same payment is a correction,
  -- not another application.
  unique (payment_id, invoice_id)
);

create index payment_applications_by_invoice on payment_applications (invoice_id);
create index payment_applications_by_payment on payment_applications (payment_id);

-- --------------------------------------------------------------- numbering --

-- Gap-free per organization. The advisory lock serialises allocation for one
-- organization only, so two owners issuing invoices at the same moment do not
-- wait on each other.
create or replace function invoice_assign_number() returns trigger
language plpgsql as $$
declare
  next_number integer;
begin
  if new.number is not null and new.number > 0 then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('invoice_number:' || new.organization_id::text));

  select coalesce(max(number), 0) + 1 into next_number
  from invoices
  where organization_id = new.organization_id;

  new.number := next_number;
  return new;
end;
$$;

create trigger invoice_assign_number
  before insert on invoices
  for each row execute function invoice_assign_number();

-- --------------------------------------------------------------- settlement --

-- amount_paid and state follow from the applications, so neither can drift
-- from them. The check constraint above then makes I-04 unbreakable: an
-- application that would overpay aborts the transaction that wrote it.
create or replace function invoice_resettle() returns trigger
language plpgsql as $$
declare
  target uuid := coalesce(new.invoice_id, old.invoice_id);
  paid   bigint;
begin
  select coalesce(sum(amount_centavos), 0) into paid
  from payment_applications
  where invoice_id = target;

  update invoices
  set amount_paid_centavos = paid,
      state = case
        when state = 'VOIDED' then 'VOIDED'
        when state = 'DRAFT' then 'DRAFT'
        when paid >= total_centavos then 'PAID'
        when paid > 0 then 'PARTIALLY_PAID'
        when due_on < current_date then 'OVERDUE'
        else 'ISSUED'
      end
  where id = target;

  return null;
end;
$$;

create trigger payment_application_resettles
  after insert or update or delete on payment_applications
  for each row execute function invoice_resettle();

-- --------------------------------------------------------------------- RLS --

alter table invoices enable row level security;
alter table invoice_lines enable row level security;
alter table payment_applications enable row level security;

create policy org_isolation on invoices using (
  organization_id = current_setting('app.organization_id', true)::uuid
);

create policy org_isolation on invoice_lines using (
  organization_id = current_setting('app.organization_id', true)::uuid
);

create policy org_isolation on payment_applications using (
  organization_id = current_setting('app.organization_id', true)::uuid
);

-- A tenant sees their own claims without an organization scope, the same way
-- they already see their own payments. Without this a tenant reading their own
-- invoice gets zero rows rather than an error — the failure mode P-03 warns
-- about, where an authorization bug looks like an empty screen.
create policy own_invoice on invoices for select using (
  tenant_id = current_setting('app.user_id', true)::uuid
);

create policy own_invoice_line on invoice_lines for select using (
  exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and i.tenant_id = current_setting('app.user_id', true)::uuid
  )
);

grant select, insert, update on invoices to rental_app;
grant select, insert, update on invoice_lines to rental_app;
grant select, insert on payment_applications to rental_app;

commit;
