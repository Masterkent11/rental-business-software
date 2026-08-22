-- Public read for the inventory behind a published listing.
--
-- The first migration gave listings a public-read policy but left the tables it
-- joins — properties, resources, media, tours — organization-scoped only. The
-- result was not an error: the joins simply matched nothing and the marketplace
-- returned zero rows.
--
-- That is the cost P-03 names openly ("a class of bug where the two layers
-- disagree and a legitimate query returns nothing"), and it is still the
-- preferable failure: a policy that is too tight shows an empty list, while one
-- that is too loose shows another organization's data.
--
-- Each policy below exposes a row ONLY while it backs a published listing.
-- Unpublish the listing and the property, resource, photos, and tour become
-- invisible again — no separate cleanup, because the condition is the listing's
-- own state.

create policy inventory_public_read on properties for select using (
  exists (
    select 1
      from listings l
      join rentable_resources r on r.id = l.resource_id
     where r.property_id = properties.id
       and l.state = 'PUBLISHED'
  )
);

create policy inventory_public_read on rentable_resources for select using (
  exists (
    select 1 from listings l
     where l.resource_id = rentable_resources.id
       and l.state = 'PUBLISHED'
  )
);

create policy inventory_public_read on media_assets for select using (
  exists (
    select 1 from listings l
     where l.id = media_assets.listing_id
       and l.state = 'PUBLISHED'
  )
);

create policy inventory_public_read on virtual_tours for select using (
  exists (
    select 1 from listings l
     where l.resource_id = virtual_tours.resource_id
       and l.state = 'PUBLISHED'
  )
);
