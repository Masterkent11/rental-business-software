-- Who the hold belongs to.
--
-- Sprint 3 placed holds anonymously, which was enough to prove I-01 but leaves
-- a booking nobody owns: the customer cannot see it, and at check-in nobody can
-- say who is arriving. A booking without a guest is not a booking.
--
-- Nullable, because leases and owner blocks are occupancy too and have no guest
-- (a lease has a tenant, which is Sprint 5's relationship, not this column).
alter table occupancies
  add column held_by uuid references user_profiles(id);

create index occupancies_held_by on occupancies (held_by)
  where held_by is not null;
