begin;

create extension if not exists pgcrypto with schema extensions;

insert into organizations (id, legal_name, trading_name, state)
values ('d0000000-0000-4000-8000-000000000001', 'Demo Homes PH Inc.', 'Demo Homes PH', 'VERIFIED')
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
   '{"sub":"d0000000-0000-4000-8000-0000000000e1","email":"demo.customer2@example.com","email_verified":true}', now(), now(), now())
on conflict (provider_id, provider) do nothing;

insert into user_profiles (id, display_name, email) values
  ('d0000000-0000-4000-8000-0000000000a1', 'Dana Reyes', 'demo.owner@example.com'),
  ('d0000000-0000-4000-8000-0000000000c1', 'Carlo Mendoza', 'demo.customer@example.com'),
  ('d0000000-0000-4000-8000-0000000000e1', 'Bea Santos', 'demo.customer2@example.com')
on conflict (id) do update set display_name = excluded.display_name, email = excluded.email;

insert into user_capabilities (user_id, capability, organization_id, source_type)
select v.user_id::uuid, v.capability, v.organization_id::uuid, v.source_type
  from (values
    ('d0000000-0000-4000-8000-0000000000a1', 'CUSTOMER', null, 'REGISTRATION'),
    ('d0000000-0000-4000-8000-0000000000a1', 'OWNER', 'd0000000-0000-4000-8000-000000000001', 'MEMBERSHIP'),
    ('d0000000-0000-4000-8000-0000000000c1', 'CUSTOMER', null, 'REGISTRATION'),
    ('d0000000-0000-4000-8000-0000000000e1', 'CUSTOMER', null, 'REGISTRATION')
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
values ('d0000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-000000000001', 'OWNER')
on conflict (user_id, organization_id, role) do update set revoked_at = null;

insert into properties (id, organization_id, name, property_type, address_line, area_label, city_label) values
  ('d1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Skyline Tower Studio', 'CONDO', 'Cebu IT Park, Salinas Drive', 'Brgy. Apas', 'Cebu City'),
  ('d1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Lahug Garden Apartments', 'APARTMENT', '24 Gorordo Avenue', 'Brgy. Lahug', 'Cebu City'),
  ('d1000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'Talamban Family House', 'HOUSE', '8 Sunrise Drive, Pit-os Road', 'Brgy. Talamban', 'Cebu City'),
  ('d1000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'Sambag Rooms', 'ROOM', '115 V. Rama Avenue', 'Brgy. Sambag I', 'Cebu City'),
  ('d1000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', 'Kamputhaw Student Residence', 'BOARDING_HOUSE', '31 Kamputhaw Street', 'Brgy. Kamputhaw', 'Cebu City')
on conflict (id) do update
  set name = excluded.name, property_type = excluded.property_type, address_line = excluded.address_line,
      area_label = excluded.area_label, city_label = excluded.city_label;

insert into rentable_resources (id, organization_id, property_id, root_id, label, resource_type, rental_mode) values
  ('d2000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'Studio 18F', 'UNIT', 'SHORT_TERM'),
  ('d2000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000002', 'Unit 2B', 'UNIT', 'LONG_TERM'),
  ('d2000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000003', 'Whole house', 'UNIT', 'SHORT_TERM'),
  ('d2000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', 'd2000000-0000-4000-8000-000000000004', 'Room 3', 'ROOM', 'LONG_TERM'),
  ('d2000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000005', 'd2000000-0000-4000-8000-000000000005', 'Bed 4A', 'BED_SPACE', 'LONG_TERM')
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

insert into virtual_tours (id, organization_id, resource_id, state, scene_count) values
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
