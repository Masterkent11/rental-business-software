-- What a reservation costs, if the owner offers one at all.
--
-- Deliberately nullable with no default. The alternative — inventing a rule
-- like "one month's rent" — would be the platform setting a price on the
-- owner's behalf and then forfeiting it on their behalf when a customer
-- withdraws. Reservations are opt-in: no fee set, no reservation offered.
alter table listings
  add column reservation_fee_centavos bigint
    check (reservation_fee_centavos is null or reservation_fee_centavos > 0);

comment on column listings.reservation_fee_centavos is
  'Null means this owner does not offer reservations on this listing.';
