alter table properties
  add column if not exists property_type text not null default 'APARTMENT'
    check (property_type in ('APARTMENT','CONDO','HOUSE','ROOM','BOARDING_HOUSE')),
  add column if not exists address_line text not null default '';

alter table listings
  add column if not exists max_occupants int not null default 2 check (max_occupants between 1 and 50),
  add column if not exists bedrooms int not null default 1 check (bedrooms between 0 and 50),
  add column if not exists bathrooms int not null default 1 check (bathrooms between 0 and 50),
  add column if not exists floor_area_sqm int check (floor_area_sqm is null or floor_area_sqm > 0),
  add column if not exists cleaning_fee_centavos bigint not null default 0 check (cleaning_fee_centavos >= 0),
  add column if not exists available_from date,
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table media_assets
  add column if not exists storage_path text,
  add column if not exists content_type text,
  add column if not exists size_bytes bigint check (size_bytes is null or size_bytes > 0);

create unique index if not exists media_assets_storage_path
  on media_assets (storage_path) where storage_path is not null;

update properties set property_type = 'CONDO' where name ilike '%residence%' or name ilike '%condo%';
update properties set property_type = 'BOARDING_HOUSE' where name ilike '%boarding%';
update properties set property_type = 'HOUSE' where name ilike '%house%' and name not ilike '%boarding%';

update listings set published_at = created_at where state = 'PUBLISHED' and published_at is null;

update listings l
   set max_occupants = 1, bedrooms = 0, bathrooms = 0
  from rentable_resources r
 where r.id = l.resource_id and r.resource_type in ('PARKING','STORAGE');

update listings l
   set max_occupants = 1, bedrooms = 0
  from rentable_resources r
 where r.id = l.resource_id and r.resource_type = 'BED_SPACE';

create index if not exists listings_search_price on listings (price_centavos) where state = 'PUBLISHED';
create index if not exists properties_type on properties (property_type);
