begin;

update listings l set furnishing = v.furnishing, pets_allowed = v.pets
  from (values
    ('d3000000-0000-4000-8000-000000000001'::uuid, 'FURNISHED', false),
    ('d3000000-0000-4000-8000-000000000002'::uuid, null, true),
    ('d3000000-0000-4000-8000-000000000003'::uuid, 'FURNISHED', true),
    ('d3000000-0000-4000-8000-000000000004'::uuid, 'FURNISHED', false),
    ('d3000000-0000-4000-8000-000000000005'::uuid, 'FURNISHED', false),
    ('d3000000-0000-4000-8000-000000000012'::uuid, 'FURNISHED', null)
  ) as v(id, furnishing, pets)
 where l.id = v.id;

insert into properties (id, organization_id, name, property_type, address_line, area_label, city_label, latitude, longitude, location_privacy) values
  ('d1000000-0000-4000-8000-000000000021', 'd0000000-0000-4000-8000-000000000001', 'Bajada Park Residences', 'CONDO', 'J.P. Laurel Avenue', 'Brgy. Bajada', 'Davao City', 7.0897, 125.6107, 'APPROXIMATE'),
  ('d1000000-0000-4000-8000-000000000022', 'd0000000-0000-4000-8000-000000000001', 'Lanang Garden House', 'HOUSE', '14 Damosa Road', 'Brgy. Lanang', 'Davao City', 7.1050, 125.6420, 'APPROXIMATE'),
  ('d1000000-0000-4000-8000-000000000023', 'd0000000-0000-4000-8000-000000000001', 'Catalunan Grande Homes', 'HOUSE', 'Catalunan Grande Road', 'Brgy. Catalunan Grande', 'Davao City', 7.0700, 125.5600, 'APPROXIMATE')
on conflict (id) do update
  set name = excluded.name, property_type = excluded.property_type, address_line = excluded.address_line,
      area_label = excluded.area_label, city_label = excluded.city_label, latitude = excluded.latitude,
      longitude = excluded.longitude, location_privacy = excluded.location_privacy;

insert into rentable_resources (id, organization_id, property_id, root_id, label, resource_type, rental_mode) values
  ('d2000000-0000-4000-8000-000000000021', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000021', 'd2000000-0000-4000-8000-000000000021', 'Unit 9C', 'UNIT', 'LONG_TERM'),
  ('d2000000-0000-4000-8000-000000000022', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000022', 'd2000000-0000-4000-8000-000000000022', 'Whole house', 'UNIT', 'SHORT_TERM'),
  ('d2000000-0000-4000-8000-000000000023', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000023', 'd2000000-0000-4000-8000-000000000023', 'Lot 12, Block 4', 'UNIT', 'SALE')
on conflict (id) do update set label = excluded.label, rental_mode = excluded.rental_mode;

insert into listings (
  id, organization_id, resource_id, intent, kind, title, description, price_centavos, cleaning_fee_centavos,
  amenities, house_rules, terms, min_stay_nights, advance_months, deposit_months,
  max_occupants, bedrooms, bathrooms, floor_area_sqm, lot_area_sqm, parking_slots, sale_status,
  available_from, furnishing, pets_allowed, state, published_at
) values
  ('d3000000-0000-4000-8000-000000000021', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000021', 'RENT', 'LONG_TERM',
   'One-bedroom condo near Abreeza, Davao',
   'A furnished one-bedroom unit on the ninth floor, a short walk from Abreeza Mall and the J.P. Laurel business strip. Building has a pool, a gym and 24/7 security.',
   2200000, 0, '{Furnished,Aircon,Pool access,Gym access,Fibre Wi-Fi}', '{No smoking,No pets}',
   '{12-month minimum term,Association dues included}', null, 1, 2, 2, 1, 1, 34, null, 0, null,
   null, 'FURNISHED', false, 'PUBLISHED', now()),
  ('d3000000-0000-4000-8000-000000000022', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000022', 'RENT', 'SHORT_TERM',
   'Garden house for families in Lanang, Davao',
   'A three-bedroom house with a shaded garden near Damosa and the Lanang business park. Full kitchen, two parking slots and space for the whole family.',
   480000, 70000, '{Garden,Full kitchen,Parking for two cars,Aircon,Fibre Wi-Fi,Washing machine}', '{Pets on request,No parties}',
   '{Check-in 2:00 PM · check-out 11:00 AM,Full payment on booking}', 2, 0, 0, 7, 3, 2, 150, null, 2, null,
   null, 'FURNISHED', true, 'PUBLISHED', now()),
  ('d3000000-0000-4000-8000-000000000023', 'd0000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000023', 'SALE', null,
   'Two-storey house and lot in Catalunan Grande, Davao',
   'A two-storey family home in a gated subdivision with a clubhouse and pool. Four bedrooms, three bathrooms, a carport and a small garden. Ready for occupancy.',
   0, 0, '{Gated,Clubhouse,Pool,Carport,Garden}', '{}', '{}', null, 0, 0, 1, 4, 3, 180, 200, 1, 'READY_FOR_OCCUPANCY',
   null, 'UNFURNISHED', null, 'PUBLISHED', now())
on conflict (id) do update
  set title = excluded.title, description = excluded.description, price_centavos = excluded.price_centavos,
      cleaning_fee_centavos = excluded.cleaning_fee_centavos, amenities = excluded.amenities,
      house_rules = excluded.house_rules, terms = excluded.terms, min_stay_nights = excluded.min_stay_nights,
      advance_months = excluded.advance_months, deposit_months = excluded.deposit_months,
      max_occupants = excluded.max_occupants, bedrooms = excluded.bedrooms, bathrooms = excluded.bathrooms,
      floor_area_sqm = excluded.floor_area_sqm, lot_area_sqm = excluded.lot_area_sqm,
      parking_slots = excluded.parking_slots, sale_status = excluded.sale_status,
      furnishing = excluded.furnishing, pets_allowed = excluded.pets_allowed, state = 'PUBLISHED',
      published_at = coalesce(listings.published_at, now()), updated_at = now();

insert into listing_sale_terms (listing_id, organization_id, asking_price_internal_centavos, price_negotiable, commercial_notes)
values ('d3000000-0000-4000-8000-000000000023', 'd0000000-0000-4000-8000-000000000001', 980000000, true, '')
on conflict (listing_id) do update
  set asking_price_internal_centavos = excluded.asking_price_internal_centavos,
      price_negotiable = excluded.price_negotiable, updated_at = now();

commit;
