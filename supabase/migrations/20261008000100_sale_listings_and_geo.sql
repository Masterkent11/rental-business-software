alter table listings add column if not exists intent text not null default 'RENT';
alter table listings drop constraint if exists listings_intent_check;
alter table listings add constraint listings_intent_check check (intent in ('RENT', 'SALE'));

alter table listings alter column kind drop not null;
alter table listings drop constraint if exists listings_kind_matches_intent;
alter table listings add constraint listings_kind_matches_intent check ((intent = 'RENT') = (kind is not null));

alter table listings drop constraint if exists listings_sale_price_private;
alter table listings add constraint listings_sale_price_private check (
  intent = 'RENT'
  or (price_centavos = 0 and cleaning_fee_centavos = 0 and reservation_fee_centavos is null)
);

alter table listings add column if not exists lot_area_sqm integer;
alter table listings drop constraint if exists listings_lot_area_sqm_check;
alter table listings add constraint listings_lot_area_sqm_check check (lot_area_sqm is null or lot_area_sqm > 0);

alter table listings add column if not exists parking_slots integer not null default 0;
alter table listings drop constraint if exists listings_parking_slots_check;
alter table listings add constraint listings_parking_slots_check check (parking_slots between 0 and 50);

alter table listings add column if not exists sale_status text;
alter table listings drop constraint if exists listings_sale_status_check;
alter table listings add constraint listings_sale_status_check check (
  sale_status is null or sale_status in ('READY_FOR_OCCUPANCY', 'PRE_SELLING', 'UNDER_CONSTRUCTION')
);
alter table listings drop constraint if exists listings_sale_status_intent;
alter table listings add constraint listings_sale_status_intent check (
  (intent = 'SALE' and sale_status is not null) or (intent = 'RENT' and sale_status is null)
);

create index if not exists listings_published_intent on listings (intent, published_at desc) where state = 'PUBLISHED';

alter table rentable_resources drop constraint if exists rentable_resources_rental_mode_check;
alter table rentable_resources add constraint rentable_resources_rental_mode_check check (
  rental_mode in ('LONG_TERM', 'SHORT_TERM', 'HYBRID', 'SALE')
);

alter table properties drop constraint if exists properties_property_type_check;
alter table properties add constraint properties_property_type_check check (
  property_type in ('APARTMENT', 'CONDO', 'HOUSE', 'ROOM', 'BOARDING_HOUSE', 'TOWNHOUSE', 'LOT', 'COMMERCIAL')
);

alter table properties add column if not exists latitude double precision;
alter table properties add column if not exists longitude double precision;
alter table properties drop constraint if exists properties_latitude_check;
alter table properties add constraint properties_latitude_check check (latitude is null or latitude between -90 and 90);
alter table properties drop constraint if exists properties_longitude_check;
alter table properties add constraint properties_longitude_check check (longitude is null or longitude between -180 and 180);
alter table properties drop constraint if exists properties_coordinates_paired;
alter table properties add constraint properties_coordinates_paired check ((latitude is null) = (longitude is null));

alter table properties add column if not exists location_privacy text not null default 'APPROXIMATE';
alter table properties drop constraint if exists properties_location_privacy_check;
alter table properties add constraint properties_location_privacy_check check (location_privacy in ('EXACT', 'APPROXIMATE'));

create index if not exists properties_geo on properties using gist (point(longitude, latitude)) where latitude is not null;

create table if not exists listing_sale_terms (
  listing_id                      uuid primary key references listings(id) on delete cascade,
  organization_id                 uuid not null references organizations(id),
  asking_price_internal_centavos  bigint,
  price_negotiable                boolean not null default true,
  commercial_notes                text not null default '',
  updated_by                      uuid references user_profiles(id),
  updated_at                      timestamptz not null default now(),
  constraint listing_sale_terms_price_positive check (
    asking_price_internal_centavos is null or asking_price_internal_centavos > 0
  ),
  constraint listing_sale_terms_notes_length check (char_length(commercial_notes) <= 4000)
);

create index if not exists listing_sale_terms_org on listing_sale_terms (organization_id);

alter table listing_sale_terms enable row level security;

drop policy if exists org_isolation on listing_sale_terms;
create policy org_isolation on listing_sale_terms using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);

revoke all on listing_sale_terms from public, anon, authenticated;
grant select, insert, update on listing_sale_terms to rental_app;
