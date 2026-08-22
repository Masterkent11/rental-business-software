-- Approval is what takes a place off the market.
--
-- entities.md is explicit: an application places no hold, and *approval* is the
-- act that removes the resource from sale. The owner screen says the same thing
-- to the owner ("held for 72 hours while they pay the advance and deposit").
-- Without this the two agreed with each other and disagreed with the code:
-- approving an application with no reservation fee placed nothing at all, and
-- the unit stayed bookable by somebody else.
--
-- Nullable, because most occupancy has no application behind it — a nightly
-- booking, an owner block.
alter table occupancies
  add column application_id uuid references applications(id);

create index occupancies_application on occupancies (application_id)
  where application_id is not null;

comment on column occupancies.application_id is
  'The application that caused this occupancy: a reservation fee, or an approval.';
