-- Sprint 5 — Applications and reservations.
--
-- The rule that shapes this file: **an application places no hold.** Many
-- customers may apply for one resource, and approval is what takes it off the
-- market (entities.md). A reservation fee is the separate, optional way to hold
-- a place while a decision is made — and it is the only thing here that touches
-- the occupancy timeline.

create table applications (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id),
  resource_id      uuid not null,
  applicant_id     uuid not null references user_profiles(id),
  desired_move_in  date not null,
  desired_term_months int not null check (desired_term_months > 0),
  -- Applicant-supplied context, not a questionnaire the platform scores.
  message          text not null default '',
  state            text not null default 'SUBMITTED' check (state in (
                     'SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED',
                     'WITHDRAWN','EXPIRED')),
  -- Why, in the owner's words. Shown to the applicant on rejection, because a
  -- refusal with no reason is the thing customers complain about most.
  decision_reason  text,
  decided_by       uuid references user_profiles(id),
  decided_at       timestamptz,
  created_at       timestamptz not null default now(),
  foreign key (resource_id, organization_id)
    references rentable_resources(id, organization_id),
  -- A decision has to say who made it and when.
  constraint decided_has_actor check (
    (state in ('APPROVED','REJECTED')) = (decided_at is not null)
  )
);

-- One live application per person per resource. Re-applying after a rejection
-- is allowed; applying twice at once is a mistake, not an intention.
create unique index applications_one_live
  on applications (applicant_id, resource_id)
  where state in ('SUBMITTED','UNDER_REVIEW');

create index applications_org on applications (organization_id, created_at desc);
create index applications_applicant on applications (applicant_id, created_at desc);

/**
 * Applicant-supplied evidence. Nothing more.
 *
 * The platform performs no screening, scoring, or credit check — permanently
 * (D-27, a non-goal). These are documents an owner asked for and a person chose
 * to send.
 *
 * Only the storage PATH lives here. The bytes are in a private bucket and are
 * reachable solely through short-lived signed URLs the API issues (ADR-0009).
 * A Philippine government ID must never be behind a guessable public URL.
 */
create table application_documents (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id),
  application_id   uuid not null references applications(id) on delete cascade,
  kind             text not null check (kind in (
                     'GOVERNMENT_ID','PROOF_OF_INCOME','EMPLOYMENT_LETTER',
                     'BUSINESS_PERMIT','OTHER')),
  storage_path     text not null unique,
  file_name        text not null,
  content_type     text not null,
  size_bytes       bigint not null check (size_bytes > 0),
  uploaded_at      timestamptz not null default now()
);

create index application_documents_application
  on application_documents (application_id);

/**
 * A reservation fee.
 *
 * This is the one thing on the long-term path that touches the timeline before
 * a lease exists: paying it places a HELD occupancy for seven days, so the
 * customer is not out-competed while the owner decides.
 *
 * The fee's outcome is a promise about money, so it is a state here rather than
 * an inference from the application's state — "approved" and "the fee was
 * credited" can be true at different moments, and the second is the one the
 * customer is owed an answer about.
 */
create table reservations (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id),
  application_id   uuid not null unique references applications(id),
  occupancy_id     uuid unique references occupancies(id),
  payment_id       uuid unique references payments(id),
  fee_centavos     bigint not null check (fee_centavos > 0),
  state            text not null default 'PENDING_PAYMENT' check (state in (
                     'PENDING_PAYMENT','ACTIVE','CREDITED','REFUNDED',
                     'FORFEITED','EXPIRED')),
  expires_at       timestamptz,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz
);

create index reservations_org on reservations (organization_id, created_at desc);

-- A reservation is occupancy with its own cause, distinct from a booking or a
-- lease: it must block the resource identically while being refundable, which a
-- BOOKING is not.
alter table occupancies drop constraint occupancies_kind_check;
alter table occupancies add constraint occupancies_kind_check
  check (kind in ('BOOKING','LEASE','BLOCK','RESERVATION'));

/**
 * Two ledger entry types this sprint needs.
 *
 * `money-model.md` fixes the entry-type vocabulary, and neither an existing
 * type nor a combination of them can say what happens to a reservation fee at
 * the two moments that matter:
 *
 *   - CREDITED  — approval turns the fee into money already paid toward the
 *                 lease. It is not a refund and not revenue; it is a claim the
 *                 tenant now holds against their first invoice.
 *   - FORFEITED — withdrawal turns it into the owner's money. Recording that as
 *                 a plain PAYMENT_RECEIVED would lose *why*, and the why is
 *                 exactly what a customer disputes.
 *
 * Recorded here as a deliberate extension to the domain vocabulary.
 */
alter table ledger_entries drop constraint ledger_entries_entry_type_check;
alter table ledger_entries add constraint ledger_entries_entry_type_check
  check (entry_type in (
    'INVOICE_ISSUED','INVOICE_VOIDED','PAYMENT_RECEIVED','PAYMENT_CORRECTED',
    'REFUND_ISSUED','DEPOSIT_HELD','DEPOSIT_APPLIED','DEPOSIT_RETURNED',
    'BOOKING_PREPAID','RESERVATION_FEE_CREDITED','RESERVATION_FEE_FORFEITED'));

alter table ledger_entries drop constraint ledger_entries_cause_type_check;
alter table ledger_entries add constraint ledger_entries_cause_type_check
  check (cause_type in (
    'PAYMENT','INVOICE','BOOKING','DEPOSIT_BALANCE','APPLICATION','RESERVATION'));

alter table applications           enable row level security;
alter table application_documents  enable row level security;
alter table reservations           enable row level security;

-- The organization sees its own; the applicant sees theirs. Both are true at
-- once, and neither implies the other.
create policy org_isolation on applications using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
create policy own_application on applications for select using (
  applicant_id = nullif(current_setting('app.user_id', true), '')::uuid
);

create policy org_isolation on application_documents using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
create policy own_documents on application_documents for select using (
  exists (
    select 1 from applications a
     where a.id = application_documents.application_id
       and a.applicant_id = nullif(current_setting('app.user_id', true), '')::uuid
  )
);

create policy org_isolation on reservations using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);
create policy own_reservation on reservations for select using (
  exists (
    select 1 from applications a
     where a.id = reservations.application_id
       and a.applicant_id = nullif(current_setting('app.user_id', true), '')::uuid
  )
);

grant select, insert, update on applications to rental_app;
grant select, insert on application_documents to rental_app;
grant select, insert, update on reservations to rental_app;
