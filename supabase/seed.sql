-- Sprint 1 seed.
--
-- The same three properties and seven listings the Flutter fixtures use, as
-- real rows — so swapping the app from fixtures to the API is a change of
-- source, not a change of content. If the screen looks different afterwards,
-- the mapping is wrong, and that is worth knowing immediately.
--
-- Amounts are the ones the documentation uses on purpose (₱15,000 condo,
-- ₱8,500 unit, ₱3,500 bed space, ₱1,500/night), so scope conversations stay
-- grounded in realistic Philippine money.

insert into organizations (id, legal_name, trading_name, state) values
  ('11111111-1111-1111-1111-111111111111', 'Santos Property Holdings Inc.', 'Santos Property Holdings', 'VERIFIED'),
  ('22222222-2222-2222-2222-222222222222', 'Skyline Property Management Corp.', 'Skyline Property Management', 'VERIFIED'),
  ('33333333-3333-3333-3333-333333333333', 'Villa Rentals', 'Villa Rentals', 'VERIFIED');

insert into properties (id, organization_id, name, area_label, city_label) values
  ('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ABC Apartment', 'Brgy. Kamputhaw', 'Cebu City'),
  ('a2222222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Skyline Residences', 'Brgy. Apas', 'Cebu City'),
  ('a3333333-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Villa Boarding House', 'Brgy. Sambag II', 'Cebu City');

-- root_id equals id for a top-level resource; a bed space inside a room would
-- carry the unit's id, which is what makes the overlap check tree-shaped.
insert into rentable_resources (id, organization_id, property_id, root_id, label, resource_type, rental_mode) values
  ('b1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'Unit 203', 'UNIT', 'LONG_TERM'),
  ('b1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000002', 'Parking 12', 'PARKING', 'LONG_TERM'),
  -- HYBRID: one resource, two listings, both live at once (U-01).
  ('b2222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'a2222222-0000-0000-0000-000000000002', 'b2222222-0000-0000-0000-000000000001', 'Condo 101', 'UNIT', 'HYBRID'),
  ('b3333333-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'a3333333-0000-0000-0000-000000000003', 'b3333333-0000-0000-0000-000000000001', 'Room 101', 'ROOM', 'LONG_TERM');

-- Bed A lives inside Room 101: root_id points at the room, so leasing the room
-- will block the bed and vice versa once occupancy lands in Sprint 3.
insert into rentable_resources (id, organization_id, property_id, parent_id, root_id, label, resource_type, rental_mode) values
  ('b3333333-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'a3333333-0000-0000-0000-000000000003', 'b3333333-0000-0000-0000-000000000001', 'b3333333-0000-0000-0000-000000000001', 'Bed A', 'BED_SPACE', 'LONG_TERM');

update rentable_resources set shared_facilities = '{"CR — shared with 3 others on the floor","Kitchen — shared, with your own shelf","Laundry area — shared, no schedule","Wi-Fi — shared line, included in rent"}'
 where id = 'b3333333-0000-0000-0000-000000000002';

insert into listings (id, organization_id, resource_id, kind, title, description, price_centavos, state, amenities, house_rules, terms, min_stay_nights, advance_months, deposit_months) values
  ('c1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'b1111111-0000-0000-0000-000000000001', 'LONG_TERM',
   'One-bedroom corner unit with cross-ventilation',
   'Second-floor corner unit with windows on two sides, so it stays cool without running the aircon all day. Inverter aircon in the bedroom.',
   850000, 'PUBLISHED',
   '{Inverter aircon,Own kitchen,Own CR,Fibre-ready,Water heater,Parking available}',
   '{No pets,No smoking indoors,Visitors until 10 PM}',
   '{12-month minimum term,Water and electricity billed separately,Rent due on the 5th of each month}',
   null, 1, 2),
  ('c1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'b1111111-0000-0000-0000-000000000002', 'LONG_TERM',
   'Covered parking slot, 24/7 access',
   'Covered slot on the ground floor, wide enough for a mid-size SUV. Manned gate, CCTV.',
   200000, 'PUBLISHED',
   '{Covered,24/7 access,CCTV,Manned gate}', '{No overnight repairs}',
   '{12-month minimum term}', null, 0, 1),
  ('c2222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'b2222222-0000-0000-0000-000000000001', 'LONG_TERM',
   'Furnished condo with balcony, east-facing',
   'Fully furnished 32 sqm unit facing east. Generator, gym, 24/7 security. Fibre-ready.',
   1500000, 'PUBLISHED',
   '{Inverter aircon,Own kitchen,Own CR,Fibre-ready,Water heater,Parking available}',
   '{No pets,No smoking indoors,Visitors until 10 PM}',
   '{12-month minimum term,Water and electricity billed separately,Rent due on the 5th of each month}',
   null, 1, 2),
  ('c2222222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'b2222222-0000-0000-0000-000000000001', 'SHORT_TERM',
   'Condo stay, walking distance to IT Park',
   'The same condo, available nightly between long-term tenancies. Fresh linens, fast Wi-Fi, a proper desk by the window.',
   150000, 'PUBLISHED',
   '{Inverter aircon,Own kitchen,Own CR,Fibre-ready}',
   '{No parties,No smoking indoors,Quiet hours after 10 PM}',
   '{Check-in 2:00 PM · check-out 12:00 NN,Full payment on booking,Free cancellation up to 7 days before check-in}',
   2, 0, 0),
  ('c3333333-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'b3333333-0000-0000-0000-000000000002', 'LONG_TERM',
   'Bed space near USC, all-in utilities',
   'Lower bunk in a four-person room, with a personal locker and a study lamp of your own. Rent is all-in.',
   350000, 'PUBLISHED',
   '{Personal locker,Study lamp,Wi-Fi included,Utilities included}',
   '{No pets,No smoking indoors,Visitors until 10 PM}',
   '{12-month minimum term,Utilities included in rent}', null, 1, 1),
  -- Deliberately not published: proves the read path refuses drafts (D-12).
  ('c3333333-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'b3333333-0000-0000-0000-000000000001', 'LONG_TERM',
   'Private room with own CR', 'Draft — should never reach a customer.', 600000, 'DRAFT',
   '{Aircon,Own CR}', '{}', '{}', null, 1, 2);

-- A nightly listing on a bed that sits inside a room.
--
-- The seed needs one piece of NESTED short-term inventory, because the nesting
-- rule (I-01) is untestable without it: leasing the room must block this bunk.
insert into listings (id, organization_id, resource_id, kind, title, description,
  price_centavos, state, amenities, house_rules, terms, min_stay_nights,
  advance_months, deposit_months) values
  ('c3333333-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333',
   'b3333333-0000-0000-0000-000000000002', 'SHORT_TERM',
   'Bunk near USC, by the night',
   'The same bunk, available nightly when it is between long-term tenants. Locker, study lamp, and all-in utilities.',
   45000, 'PUBLISHED',
   '{Personal locker,Study lamp,Wi-Fi included,Utilities included}',
   '{No parties,No smoking indoors,Quiet hours after 10 PM}',
   '{Check-in 2:00 PM · check-out 12:00 NN,Full payment on booking}', 1, 0, 0);

insert into virtual_tours (organization_id, resource_id, state, scene_count) values
  ('11111111-1111-1111-1111-111111111111', 'b1111111-0000-0000-0000-000000000001', 'PUBLISHED', 5),
  ('22222222-2222-2222-2222-222222222222', 'b2222222-0000-0000-0000-000000000001', 'PUBLISHED', 7),
  ('33333333-3333-3333-3333-333333333333', 'b3333333-0000-0000-0000-000000000002', 'PUBLISHED', 3);

insert into media_assets (organization_id, listing_id, kind, storage_url, position) values
  ('33333333-3333-3333-3333-333333333333', 'c3333333-0000-0000-0000-000000000003', 'PHOTO', 'https://images.unsplash.com/photo-1652882861012-95f3263cab63?q=80&w=900&auto=format&fit=crop', 0),
  ('11111111-1111-1111-1111-111111111111', 'c1111111-0000-0000-0000-000000000001', 'PHOTO', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=900&auto=format&fit=crop', 0),
  ('11111111-1111-1111-1111-111111111111', 'c1111111-0000-0000-0000-000000000001', 'PHOTO', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=900&auto=format&fit=crop', 1),
  ('11111111-1111-1111-1111-111111111111', 'c1111111-0000-0000-0000-000000000002', 'PHOTO', 'https://images.unsplash.com/photo-1585128792020-803d29415281?q=80&w=900&auto=format&fit=crop', 0),
  ('22222222-2222-2222-2222-222222222222', 'c2222222-0000-0000-0000-000000000001', 'PHOTO', 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?q=80&w=900&auto=format&fit=crop', 0),
  ('22222222-2222-2222-2222-222222222222', 'c2222222-0000-0000-0000-000000000002', 'PHOTO', 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=900&auto=format&fit=crop', 0),
  ('33333333-3333-3333-3333-333333333333', 'c3333333-0000-0000-0000-000000000001', 'PHOTO', 'https://images.unsplash.com/photo-1594295800284-990f74bb6928?q=80&w=900&auto=format&fit=crop', 0);

-- One listing offers a reservation fee, so the flow has something to exercise.
-- The others leave it null: reservations are opt-in, and "most owners have not
-- set one" is the realistic starting state.
update listings set reservation_fee_centavos = 200000
 where id = 'c1111111-0000-0000-0000-000000000001';
