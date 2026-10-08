begin;

create extension if not exists pgcrypto with schema extensions;

insert into organizations (id, legal_name, trading_name, state)
values
  ('d0000000-0000-4000-8000-000000000001', 'Demo Homes PH Inc.', 'Demo Homes PH', 'VERIFIED'),
  ('d0000000-0000-4000-8000-000000000002', 'Santos Realty Services', 'Santos Realty', 'VERIFIED')
on conflict (id) do update set trading_name = excluded.trading_name, state = 'VERIFIED';

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated',
   'demo.owner@example.com', extensions.crypt('DemoOwner!2026', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Dana Reyes"}', now(), now(),
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated',
   'demo.customer@example.com', extensions.crypt('DemoGuest!2026', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Carlo Mendoza"}', now(), now(),
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated',
   'demo.customer2@example.com', extensions.crypt('DemoGuest2!2026', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Bea Santos"}', now(), now(),
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated',
   'demo.agent@example.com', extensions.crypt('DemoAgent!2026', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Maria Santos"}', now(), now(),
   '', '', '', '', '', '', '', '')
on conflict (id) do update
  set encrypted_password = excluded.encrypted_password,
      email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = now();

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values
  ('d0000000-0000-4000-8000-0000000000a2', 'd0000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-0000000000a1', 'email',
   '{"sub":"d0000000-0000-4000-8000-0000000000a1","email":"demo.owner@example.com","email_verified":true}', now(), now(), now()),
  ('d0000000-0000-4000-8000-0000000000c2', 'd0000000-0000-4000-8000-0000000000c1', 'd0000000-0000-4000-8000-0000000000c1', 'email',
   '{"sub":"d0000000-0000-4000-8000-0000000000c1","email":"demo.customer@example.com","email_verified":true}', now(), now(), now()),
  ('d0000000-0000-4000-8000-0000000000e2', 'd0000000-0000-4000-8000-0000000000e1', 'd0000000-0000-4000-8000-0000000000e1', 'email',
   '{"sub":"d0000000-0000-4000-8000-0000000000e1","email":"demo.customer2@example.com","email_verified":true}', now(), now(), now()),
  ('d0000000-0000-4000-8000-0000000000b2', 'd0000000-0000-4000-8000-0000000000b1', 'd0000000-0000-4000-8000-0000000000b1', 'email',
   '{"sub":"d0000000-0000-4000-8000-0000000000b1","email":"demo.agent@example.com","email_verified":true}', now(), now(), now())
on conflict (provider_id, provider) do nothing;

insert into user_profiles (id, display_name, email) values
  ('d0000000-0000-4000-8000-0000000000a1', 'Dana Reyes', 'demo.owner@example.com'),
  ('d0000000-0000-4000-8000-0000000000c1', 'Carlo Mendoza', 'demo.customer@example.com'),
  ('d0000000-0000-4000-8000-0000000000e1', 'Bea Santos', 'demo.customer2@example.com'),
  ('d0000000-0000-4000-8000-0000000000b1', 'Maria Santos', 'demo.agent@example.com')
on conflict (id) do update set display_name = excluded.display_name, email = excluded.email;

insert into user_capabilities (user_id, capability, organization_id, source_type)
select v.user_id::uuid, v.capability, v.organization_id::uuid, v.source_type
  from (values
    ('d0000000-0000-4000-8000-0000000000a1', 'CUSTOMER', null, 'REGISTRATION'),
    ('d0000000-0000-4000-8000-0000000000a1', 'OWNER', 'd0000000-0000-4000-8000-000000000001', 'MEMBERSHIP'),
    ('d0000000-0000-4000-8000-0000000000c1', 'CUSTOMER', null, 'REGISTRATION'),
    ('d0000000-0000-4000-8000-0000000000e1', 'CUSTOMER', null, 'REGISTRATION'),
    ('d0000000-0000-4000-8000-0000000000b1', 'CUSTOMER', null, 'REGISTRATION'),
    ('d0000000-0000-4000-8000-0000000000b1', 'AGENT', null, 'REGISTRATION'),
    ('d0000000-0000-4000-8000-0000000000b1', 'OWNER', 'd0000000-0000-4000-8000-000000000002', 'MEMBERSHIP')
  ) as v(user_id, capability, organization_id, source_type)
 where not exists (
   select 1 from user_capabilities c
    where c.user_id = v.user_id::uuid
      and c.capability = v.capability
      and coalesce(c.organization_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = coalesce(v.organization_id::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
      and c.revoked_at is null
 );

insert into organization_members (user_id, organization_id, role)
values
  ('d0000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-000000000001', 'OWNER'),
  ('d0000000-0000-4000-8000-0000000000b1', 'd0000000-0000-4000-8000-000000000002', 'OWNER')
on conflict (user_id, organization_id, role) do update set revoked_at = null;

select set_config('app.verification_actor', 'seed', true);

insert into agent_profiles (
  id, user_id, display_name, headline, bio, license_number, license_authority,
  verification_state, verified_at, verification_note, specialties, areas_served, languages, public_state
) values (
  'd6000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-0000000000b1', 'Maria Santos',
  'Licensed real estate broker',
  'Helping families find their home in Metro Cebu for over five years. I specialise in house and lot, condominiums and pre-selling projects, and I answer messages the same day.',
  'REB-0045821', 'PRC',
  'VERIFIED', now(), 'Demo verification', '{House & Lot,Condo,Pre-selling,Investment}', '{Cebu City,Mandaue,Lapu-Lapu,Talisay}',
  '{English,Filipino,Cebuano}', 'PUBLIC'
)
on conflict (id) do update
  set display_name = excluded.display_name, headline = excluded.headline, bio = excluded.bio,
      license_number = excluded.license_number, license_authority = excluded.license_authority,
      verification_state = 'VERIFIED', verified_at = coalesce(agent_profiles.verified_at, now()),
      specialties = excluded.specialties, areas_served = excluded.areas_served,
      languages = excluded.languages, public_state = 'PUBLIC', updated_at = now();

insert into properties (id, organization_id, name, property_type, address_line, area_label, city_label) values
  ('d1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Skyline Tower Studio', 'CONDO', 'Cebu IT Park, Salinas Drive', 'Brgy. Apas', 'Cebu City'),
  ('d1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Lahug Garden Apartments', 'APARTMENT', '24 Gorordo Avenue', 'Brgy. Lahug', 'Cebu City'),
  ('d1000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'Talamban Family House', 'HOUSE', '8 Sunrise Drive, Pit-os Road', 'Brgy. Talamban', 'Cebu City'),
  ('d1000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'Sambag Rooms', 'ROOM', '115 V. Rama Avenue', 'Brgy. Sambag I', 'Cebu City'),
  ('d1000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', 'Kamputhaw Student Residence', 'BOARDING_HOUSE', '31 Kamputhaw Street', 'Brgy. Kamputhaw', 'Cebu City')
on conflict (id) do update
  set name = excluded.name, property_type = excluded.property_type, address_line = excluded.address_line,
      area_label = excluded.area_label, city_label = excluded.city_label;

insert into properties (id, organization_id, name, property_type, address_line, area_label, city_label) values
  ('d1000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001', 'Talamban Modern Residence', 'HOUSE', '21 Golden Ridge Road', 'Brgy. Talamban', 'Cebu City'),
  ('d1000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000001', 'Avida Towers Cebu IT Park', 'CONDO', 'Cebu IT Park, Lahug', 'Brgy. Apas', 'Cebu City'),
  ('d1000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000001', 'Cebu Business Park Residences', 'CONDO', 'Mindanao Avenue, Cebu Business Park', 'Brgy. Luz', 'Cebu City'),
  ('d1000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000002', 'Casa Mandaue Townhomes', 'TOWNHOUSE', '7 Plaridel Street', 'Brgy. Banilad', 'Mandaue City')
on conflict (id) do update
  set name = excluded.name, property_type = excluded.property_type, address_line = excluded.address_line,
      area_label = excluded.area_label, city_label = excluded.city_label;

update properties p set latitude = v.lat, longitude = v.lng, location_privacy = v.privacy
  from (values
    ('d1000000-0000-4000-8000-000000000001'::uuid, 10.3303::float8, 123.9065::float8, 'EXACT'),
    ('d1000000-0000-4000-8000-000000000002'::uuid, 10.3331, 123.8987, 'APPROXIMATE'),
    ('d1000000-0000-4000-8000-000000000003'::uuid, 10.3718, 123.9139, 'APPROXIMATE'),
    ('d1000000-0000-4000-8000-000000000004'::uuid, 10.2992, 123.8931, 'APPROXIMATE'),
    ('d1000000-0000-4000-8000-000000000005'::uuid, 10.3114, 123.8916, 'APPROXIMATE'),
    ('d1000000-0000-4000-8000-000000000011'::uuid, 10.3656, 123.9176, 'APPROXIMATE'),
    ('d1000000-0000-4000-8000-000000000012'::uuid, 10.3297, 123.9052, 'EXACT'),
    ('d1000000-0000-4000-8000-000000000013'::uuid, 10.3186, 123.9046, 'EXACT'),
    ('d1000000-0000-4000-8000-000000000014'::uuid, 10.3461, 123.9418, 'APPROXIMATE'),
    ('a1111111-0000-0000-0000-000000000001'::uuid, 10.3101, 123.8902, 'APPROXIMATE'),
    ('a2222222-0000-0000-0000-000000000002'::uuid, 10.3309, 123.9061, 'APPROXIMATE'),
    ('a3333333-0000-0000-0000-000000000003'::uuid, 10.2986, 123.8946, 'APPROXIMATE')
  ) as v(id, lat, lng, privacy)
 where p.id = v.id;

insert into rentable_resources (id, organization_id, property_id, root_id, label, resource_type, rental_mode) values
  ('d2000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'Studio 18F', 'UNIT', 'SHORT_TERM'),
  ('d2000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000002', 'Unit 2B', 'UNIT', 'LONG_TERM'),
  ('d2000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000003', 'Whole house', 'UNIT', 'SHORT_TERM'),
  ('d2000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', 'd2000000-0000-4000-8000-000000000004', 'Room 3', 'ROOM', 'LONG_TERM'),
  ('d2000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000005', 'd2000000-0000-4000-8000-000000000005', 'Bed 4A', 'BED_SPACE', 'LONG_TERM')
on conflict (id) do update set label = excluded.label, rental_mode = excluded.rental_mode;

insert into rentable_resources (id, organization_id, property_id, root_id, label, resource_type, rental_mode) values
  ('d2000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000011', 'd2000000-0000-4000-8000-000000000011', 'Talamban Modern Residence', 'UNIT', 'SALE'),
  ('d2000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000012', 'd2000000-0000-4000-8000-000000000012', 'Unit 2208', 'UNIT', 'SALE'),
  ('d2000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000013', 'd2000000-0000-4000-8000-000000000013', 'Two-bedroom model', 'UNIT', 'SALE'),
  ('d2000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000014', 'd2000000-0000-4000-8000-000000000014', 'Unit 3', 'UNIT', 'SALE')
on conflict (id) do update set label = excluded.label, rental_mode = excluded.rental_mode;

update rentable_resources
   set shared_facilities = '{"Bathroom — shared with 3 others on the floor","Kitchen — shared, with your own shelf","Study lounge — shared, open until midnight","Wi-Fi — included in rent"}'
 where id = 'd2000000-0000-4000-8000-000000000005';

insert into listings (
  id, organization_id, resource_id, kind, title, description, price_centavos, cleaning_fee_centavos,
  amenities, house_rules, terms, min_stay_nights, advance_months, deposit_months,
  max_occupants, bedrooms, bathrooms, floor_area_sqm, available_from, state, published_at
) values
  ('d3000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'SHORT_TERM',
   'Skyline studio with a city view',
   'An 18th-floor studio a short walk from Cebu IT Park. Floor-to-ceiling windows, a queen bed, a proper work desk and fast fibre Wi-Fi. Building has a pool, gym and 24/7 security.',
   280000, 50000,
   '{Fibre Wi-Fi,Inverter aircon,Smart TV,Work desk,Pool access,Gym access,Hot shower,Kitchenette}',
   '{No smoking,No parties,Quiet hours after 10 PM}',
   '{Check-in 2:00 PM · check-out 12:00 NN,Full payment on booking,Free cancellation up to 7 days before check-in}',
   2, 0, 0, 2, 1, 1, 32, null, 'PUBLISHED', now()),
  ('d3000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002', 'LONG_TERM',
   'Two-bedroom garden apartment in Lahug',
   'A bright two-bedroom apartment on a quiet street near JY Square. Open living and dining area, a full kitchen, and a small garden shared with one other unit.',
   1800000, 0,
   '{Two bedrooms,Full kitchen,Garden,Water heater,Fibre-ready,Parking for one car}',
   '{Small pets on request,No smoking indoors,Visitors until 10 PM}',
   '{12-month minimum term,Water and electricity billed separately,Rent due on the 5th of each month}',
   null, 1, 2, 4, 2, 1, 58, null, 'PUBLISHED', now()),
  ('d3000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000003', 'SHORT_TERM',
   'Family house with a veranda in Talamban',
   'A whole three-bedroom house for families and groups. Wide veranda, a cosy den, a full kitchen and parking for two cars, ten minutes from Ayala Center Cebu.',
   550000, 80000,
   '{Three bedrooms,Veranda,Full kitchen,Parking for two cars,Washing machine,Fibre Wi-Fi,Garden}',
   '{No parties,Pets on request,Quiet hours after 10 PM}',
   '{Check-in 3:00 PM · check-out 11:00 AM,Full payment on booking,Free cancellation up to 14 days before check-in}',
   2, 0, 0, 6, 3, 2, 140, null, 'PUBLISHED', now()),
  ('d3000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000004', 'LONG_TERM',
   'Private room near USC Main',
   'A furnished private room with its own desk and wardrobe, five minutes on foot from USC Main. Shared kitchen and a quiet reading lounge downstairs.',
   750000, 0,
   '{Furnished,Study desk,Wardrobe,Aircon,Wi-Fi included,Shared kitchen}',
   '{No overnight guests,No smoking,Quiet hours after 10 PM}',
   '{6-month minimum term,Electricity sub-metered,Rent due on the 1st of each month}',
   null, 1, 1, 1, 1, 0, 14, null, 'PUBLISHED', now()),
  ('d3000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000005', 'LONG_TERM',
   'Student bed space, utilities included',
   'A lower bunk in a four-person room for students. Personal locker, reading lamp, and all utilities included in the rent.',
   320000, 0,
   '{Personal locker,Reading lamp,Wi-Fi included,Utilities included,Laundry area}',
   '{No pets,No smoking,Visitors until 9 PM}',
   '{6-month minimum term,Utilities included in rent}',
   null, 1, 1, 1, 0, 0, null, null, 'PUBLISHED', now())
on conflict (id) do update
  set title = excluded.title, description = excluded.description, price_centavos = excluded.price_centavos,
      cleaning_fee_centavos = excluded.cleaning_fee_centavos, amenities = excluded.amenities,
      house_rules = excluded.house_rules, terms = excluded.terms, min_stay_nights = excluded.min_stay_nights,
      advance_months = excluded.advance_months, deposit_months = excluded.deposit_months,
      max_occupants = excluded.max_occupants, bedrooms = excluded.bedrooms, bathrooms = excluded.bathrooms,
      floor_area_sqm = excluded.floor_area_sqm, state = 'PUBLISHED',
      published_at = coalesce(listings.published_at, now()), updated_at = now();

update listings set reservation_fee_centavos = 300000 where id = 'd3000000-0000-4000-8000-000000000002';

insert into listings (
  id, organization_id, resource_id, intent, kind, title, description, price_centavos, cleaning_fee_centavos,
  amenities, house_rules, terms, min_stay_nights, advance_months, deposit_months,
  max_occupants, bedrooms, bathrooms, floor_area_sqm, lot_area_sqm, parking_slots, sale_status,
  available_from, state, published_at
) values
  ('d3000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000011', 'SALE', null,
   'Modern house and lot in Talamban',
   'A two-storey modern home on a quiet street in Talamban, ten minutes from Ayala Center Cebu. Open-plan living and dining, a family lounge, four bedrooms including an en-suite master, and a covered two-car garage. Clean title, ready for occupancy.',
   0, 0, '{Two-car garage,Garden,En-suite master,Family lounge,Maid''s room,Solar water heater,Fibre-ready}', '{}', '{}',
   null, 0, 0, 1, 4, 3, 220, 300, 2, 'READY_FOR_OCCUPANCY', null, 'PUBLISHED', now()),
  ('d3000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000012', 'SALE', null,
   'Luxury condo with a city view at IT Park',
   'A furnished three-bedroom corner unit on the 22nd floor with floor-to-ceiling windows over the city. Walking distance to Cebu IT Park offices, cafés and the Ayala Central Bloc mall. Building has a pool, gym, function rooms and 24/7 security.',
   0, 0, '{Furnished,Corner unit,City view,Pool,Gym,24/7 security,One parking slot}', '{}', '{}',
   null, 0, 0, 1, 3, 2, 105, null, 1, 'READY_FOR_OCCUPANCY', null, 'PUBLISHED', now()),
  ('d3000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000013', 'SALE', null,
   'Pre-selling two-bedroom condo in Cebu Business Park',
   'Reserve a two-bedroom unit in a new tower inside Cebu Business Park, steps from Ayala Center Cebu. Turnover in 2028. Flexible payment terms during construction are discussed privately with the developer''s representative.',
   0, 0, '{Pre-selling,Amenity deck,Lap pool,Co-working lounge,Retail podium}', '{}', '{}',
   null, 0, 0, 1, 2, 2, 75, null, 0, 'PRE_SELLING', '2028-06-30', 'PUBLISHED', now()),
  ('d3000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000014', 'SALE', null,
   'Three-bedroom townhouse in Banilad, Mandaue',
   'An end-unit townhouse in a gated row of six, near Banilad Town Centre and the Mandaue business district. Three bedrooms, two and a half bathrooms, a small garden and one parking slot.',
   0, 0, '{End unit,Gated,Garden,One parking slot,Water heater}', '{}', '{}',
   null, 0, 0, 1, 3, 3, 120, 80, 1, 'READY_FOR_OCCUPANCY', null, 'PUBLISHED', now())
on conflict (id) do update
  set title = excluded.title, description = excluded.description, amenities = excluded.amenities,
      bedrooms = excluded.bedrooms, bathrooms = excluded.bathrooms, floor_area_sqm = excluded.floor_area_sqm,
      lot_area_sqm = excluded.lot_area_sqm, parking_slots = excluded.parking_slots, sale_status = excluded.sale_status,
      available_from = excluded.available_from, state = 'PUBLISHED',
      published_at = coalesce(listings.published_at, now()), updated_at = now();

insert into listing_sale_terms (listing_id, organization_id, asking_price_internal_centavos, price_negotiable, commercial_notes)
values
  ('d3000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001', 1850000000, true, 'Owner open to offers above 17.5M for cash buyers.'),
  ('d3000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000001', 1280000000, true, 'Includes furniture. Association dues ₱6,800/month.'),
  ('d3000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000001', 850000000, false, 'Developer price list v3. 20% spread over 36 months.'),
  ('d3000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000002', 620000000, true, '')
on conflict (listing_id) do update
  set asking_price_internal_centavos = excluded.asking_price_internal_centavos,
      price_negotiable = excluded.price_negotiable, commercial_notes = excluded.commercial_notes, updated_at = now();

insert into listing_representations (
  id, organization_id, listing_id, agent_id, state, can_edit_listing, can_manage_tour, can_view_commercial,
  invited_by, invited_at, responded_at
) values
  ('d7000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000011',
   'd6000000-0000-4000-8000-000000000001', 'ACTIVE', true, true, true, 'd0000000-0000-4000-8000-0000000000a1', now(), now()),
  ('d7000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000012',
   'd6000000-0000-4000-8000-000000000001', 'ACTIVE', false, true, true, 'd0000000-0000-4000-8000-0000000000a1', now(), now())
on conflict (id) do nothing;

insert into virtual_tours (id, organization_id, resource_id, state, scene_count) values
  ('d4000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000011', 'DRAFT', 0),
  ('d4000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000012', 'DRAFT', 0),
  ('d4000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000014', 'DRAFT', 0),
  ('d4000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'DRAFT', 0),
  ('d4000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002', 'DRAFT', 0),
  ('d4000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000003', 'DRAFT', 0),
  ('d4000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000004', 'DRAFT', 0)
on conflict (resource_id) do nothing;

update properties
   set property_type = 'CONDO'
 where id = 'a2222222-0000-0000-0000-000000000002' and property_type <> 'CONDO';

update properties
   set property_type = 'BOARDING_HOUSE'
 where id = 'a3333333-0000-0000-0000-000000000003' and property_type <> 'BOARDING_HOUSE';

update virtual_tours t
   set state = 'UNPUBLISHED'
 where t.organization_id in (
         '11111111-1111-1111-1111-111111111111',
         '22222222-2222-2222-2222-222222222222',
         '33333333-3333-3333-3333-333333333333')
   and t.state = 'PUBLISHED';

commit;
