alter table listings
  add column min_lease_months int check (min_lease_months between 1 and 60),
  add column max_lease_months int check (max_lease_months between 1 and 60),
  add column allow_pending_identity_application boolean not null default false,
  add constraint listings_lease_duration_order check (min_lease_months <= max_lease_months);

alter table application_drafts drop constraint application_drafts_occupants_check;
alter table application_drafts add constraint application_drafts_occupants_check check (occupants between 1 and 50);

alter table identity_verification_sessions drop constraint identity_verification_sessions_status_check;
alter table identity_verification_sessions add constraint identity_verification_sessions_status_check
  check (status in ('CONSENT_REQUIRED','FRONT_READY','OCR_PROCESSING','OCR_REVIEW','DETAILS_CONFIRMED',
    'CHALLENGE_ACTIVE','VERIFYING','MANUAL_REVIEW','VERIFIED','FAILED','EXPIRED','CANCELLED'));
