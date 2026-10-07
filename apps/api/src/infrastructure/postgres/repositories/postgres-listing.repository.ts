import type postgres from 'postgres';
import type {
  CreateListingInput,
  CreatePropertyListingInput,
  ListingRepository,
  NewListingPhoto,
  OrganizationResource,
  OwnerProperty,
  StayPricingSource,
  UpdateListingInput,
} from '@/application/ports/repositories/listing-repository.port.ts';
import type {
  Listing,
  ListingKind,
  ListingPhoto,
  ListingQuery,
  ListingState,
  PropertyType,
  ResourceType,
} from '@/domain/listings/listing.ts';
import { centavos } from '@/domain/shared/money.ts';
import type { OrganizationId } from '@/domain/shared/organization-scope.ts';
import { sql, withScope } from '@/infrastructure/postgres/db.ts';

interface MediaRow {
  id: string;
  url: string;
  path: string | null;
  position: number;
}

interface Row {
  id: string;
  organization_id: string;
  resource_id: string;
  property_id: string;
  kind: string;
  resource_type: string;
  title: string;
  description: string;
  property_name: string;
  property_type: string;
  address_line: string;
  area_label: string;
  city_label: string;
  price_centavos: string;
  cleaning_fee_centavos: string;
  state: string;
  scene_count: number | null;
  tour_state: string | null;
  media: MediaRow[] | null;
  amenities: string[] | null;
  house_rules: string[] | null;
  terms: string[] | null;
  min_stay_nights: number | null;
  advance_months: number;
  deposit_months: number;
  max_occupants: number;
  bedrooms: number;
  bathrooms: number;
  floor_area_sqm: number | null;
  available_from: string | null;
  shared_facilities: string[] | null;
  owner_name: string;
  owner_state: string;
  published_at: Date | null;
  updated_at: Date | null;
  next_available_on: string | null;
  total_count?: string;
}

interface ResourceRow {
  id: string;
  property_id: string;
  property_name: string;
  area_label: string;
  city_label: string;
  label: string;
  resource_type: string;
  rental_mode: string;
}

const toListing = (row: Row): Listing => {
  const media = [...(row.media ?? [])].sort((a, b) => a.position - b.position);
  return {
    id: row.id,
    organizationId: row.organization_id as OrganizationId,
    resourceId: row.resource_id,
    propertyId: row.property_id,
    kind: row.kind as ListingKind,
    resourceType: row.resource_type as ResourceType,
    title: row.title,
    description: row.description,
    propertyName: row.property_name,
    propertyType: row.property_type as PropertyType,
    addressLine: row.address_line,
    areaLabel: row.area_label,
    cityLabel: row.city_label,
    priceCentavos: centavos(Number(row.price_centavos)),
    cleaningFeeCentavos: centavos(Number(row.cleaning_fee_centavos)),
    state: row.state as ListingState,
    hasTour: row.tour_state === 'PUBLISHED',
    sceneCount: row.tour_state === 'PUBLISHED' ? (row.scene_count ?? 0) : 0,
    photos: media.map((m) => m.url),
    media: media.map<ListingPhoto>((m) => ({
      id: m.id,
      url: m.url,
      storagePath: m.path,
      position: m.position,
    })),
    amenities: row.amenities ?? [],
    houseRules: row.house_rules ?? [],
    terms: row.terms ?? [],
    minStayNights: row.min_stay_nights,
    advanceMonths: row.advance_months,
    depositMonths: row.deposit_months,
    maxOccupants: row.max_occupants,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    floorAreaSqm: row.floor_area_sqm,
    availableFrom: row.available_from,
    sharedFacilities: row.shared_facilities ?? [],
    ownerName: row.owner_name,
    ownerVerified: row.owner_state === 'VERIFIED',
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    nextAvailableOn: row.next_available_on,
  };
};

const SELECT = sql`
  select
    l.id, l.organization_id, l.resource_id, l.kind, l.title, l.description,
    l.price_centavos::text as price_centavos,
    l.cleaning_fee_centavos::text as cleaning_fee_centavos,
    l.state,
    l.amenities, l.house_rules, l.terms, l.min_stay_nights,
    l.advance_months, l.deposit_months,
    l.max_occupants, l.bedrooms, l.bathrooms, l.floor_area_sqm,
    to_char(l.available_from, 'YYYY-MM-DD') as available_from,
    l.published_at, l.updated_at,
    r.resource_type, r.shared_facilities, r.property_id,
    o.trading_name as owner_name, o.state as owner_state,
    p.name as property_name, p.property_type, p.address_line, p.area_label, p.city_label,
    t.state as tour_state, t.scene_count,
    coalesce(
      (select json_agg(json_build_object(
                'id', m.id, 'url', m.storage_url, 'path', m.storage_path, 'position', m.position
              ) order by m.position, m.created_at)
         from media_assets m
        where m.listing_id = l.id and m.kind = 'PHOTO'),
      '[]'::json
    ) as media,
    case
      when l.kind = 'LONG_TERM' then
        case
          when exists (
            select 1 from occupancies o2
             where o2.root_id = r.root_id
               and o2.subtree && r.subtree
               and o2.kind in ('LEASE','RESERVATION','BLOCK')
               and (o2.state = 'COMMITTED' or (o2.state = 'HELD' and o2.expires_at > now()))
               and o2.during @> greatest(current_date, coalesce(l.available_from, current_date))
          ) then null
          else to_char(greatest(current_date, coalesce(l.available_from, current_date)), 'YYYY-MM-DD')
        end
      else
        to_char(greatest(current_date, coalesce(l.available_from, current_date)), 'YYYY-MM-DD')
    end as next_available_on
  from listings l
  join rentable_resources r on r.id = l.resource_id
  join properties p on p.id = r.property_id
  join organizations o on o.id = l.organization_id
  left join virtual_tours t on t.resource_id = r.id
`;

const textArray = (tx: postgres.TransactionSql, values: readonly string[]) =>
  tx.array(values.map((value) => value.trim()).filter((value) => value.length > 0));

async function loadOne(
  tx: postgres.TransactionSql,
  organizationId: string,
  listingId: string,
): Promise<Listing | null> {
  const rows = await tx<Row[]>`
    ${SELECT} where l.id = ${listingId} and l.organization_id = ${organizationId} limit 1
  `;
  return rows[0] ? toListing(rows[0]) : null;
}

export const postgresListingRepository = (): ListingRepository => ({
  async search(_scope, query: ListingQuery) {
    return withScope(null, async (tx) => {
      const text = query.text ? `%${query.text}%` : null;
      const order =
        query.sort === 'PRICE_ASC'
          ? tx`order by base.price_centavos::bigint asc, base.published_at desc nulls last`
          : query.sort === 'PRICE_DESC'
            ? tx`order by base.price_centavos::bigint desc, base.published_at desc nulls last`
            : tx`order by base.published_at desc nulls last, base.id`;

      const rows = await tx<Row[]>`
        with base as (
          ${SELECT}
          where l.state = 'PUBLISHED'
            ${query.ids ? tx`and l.id = any(${tx.array([...query.ids])}::uuid[])` : tx``}
            ${query.kind ? tx`and l.kind = ${query.kind}` : tx``}
            ${query.resourceType ? tx`and r.resource_type = ${query.resourceType}` : tx``}
            ${query.propertyType ? tx`and p.property_type = ${query.propertyType}` : tx``}
            ${query.hasTour ? tx`and t.state = 'PUBLISHED'` : tx``}
            ${query.guests !== undefined ? tx`and l.max_occupants >= ${query.guests}` : tx``}
            ${query.bedrooms !== undefined ? tx`and l.bedrooms >= ${query.bedrooms}` : tx``}
            ${
              query.minPriceCentavos !== undefined
                ? tx`and l.price_centavos >= ${query.minPriceCentavos}`
                : tx``
            }
            ${
              query.maxPriceCentavos !== undefined
                ? tx`and l.price_centavos <= ${query.maxPriceCentavos}`
                : tx``
            }
            ${
              text
                ? tx`and (
                      l.title ilike ${text}
                   or l.description ilike ${text}
                   or p.name ilike ${text}
                   or p.area_label ilike ${text}
                   or p.city_label ilike ${text}
                   or p.address_line ilike ${text}
                    )`
                : tx``
            }
            ${
              query.availableFrom && query.availableTo
                ? tx`and not exists (
                      select 1 from occupancies o3
                       where o3.root_id = r.root_id
                         and o3.subtree && r.subtree
                         and (o3.state = 'COMMITTED' or (o3.state = 'HELD' and o3.expires_at > now()))
                         and o3.during && daterange(${query.availableFrom}::date, ${query.availableTo}::date, '[)')
                    )
                    and (l.available_from is null or l.available_from <= ${query.availableFrom}::date)`
                : query.availableFrom
                  ? tx`and (l.available_from is null or l.available_from <= ${query.availableFrom}::date)`
                  : tx``
            }
        )
        select base.*, count(*) over ()::text as total_count
          from base
        ${order}
        limit ${query.limit} offset ${query.offset}
      `;
      return {
        items: rows.map(toListing),
        total: rows[0]?.total_count ? Number(rows[0].total_count) : 0,
      };
    });
  },

  async findPublicById(_scope, id: string) {
    return withScope(null, async (tx) => {
      const rows = await tx<Row[]>`
        ${SELECT} where l.id = ${id} and l.state = 'PUBLISHED' limit 1
      `;
      const row = rows[0];
      return row ? toListing(row) : null;
    });
  },

  async forOrganization(organizationId: string) {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<Row[]>`
        ${SELECT}
        where l.organization_id = ${organizationId}
          and l.state <> 'ARCHIVED'
        order by l.updated_at desc, l.created_at desc
      `;
      return rows.map(toListing);
    });
  },

  async findById(organizationId: string, id: string) {
    return withScope(organizationId, (tx) => loadOne(tx, organizationId, id));
  },

  async createListing(input: CreateListingInput) {
    return withScope(input.organizationId, async (tx) => {
      const inserted = await tx<{ id: string }[]>`
        insert into listings (
          organization_id, resource_id, kind, title, description,
          price_centavos, amenities, house_rules, terms,
          min_stay_nights, advance_months, deposit_months, state
        ) values (
          ${input.organizationId}, ${input.resourceId}, ${input.kind},
          ${input.title}, ${input.description}, ${input.priceCentavos},
          ${textArray(tx, input.amenities)}, ${textArray(tx, input.houseRules)},
          ${textArray(tx, input.terms)}, ${input.minStayNights},
          ${input.advanceMonths}, ${input.depositMonths}, 'DRAFT'
        )
        returning id
      `;
      const listing = await loadOne(tx, input.organizationId, inserted[0]!.id);
      return listing!;
    });
  },

  async createPropertyListing(input: CreatePropertyListingInput) {
    return withScope(input.organizationId, async (tx) => {
      const [property] = await tx<{ id: string }[]>`
        insert into properties (organization_id, name, property_type, address_line, area_label, city_label)
        values (
          ${input.organizationId}, ${input.property.name.trim()}, ${input.property.propertyType},
          ${input.property.addressLine.trim()}, ${input.property.areaLabel.trim()}, ${input.property.cityLabel.trim()}
        )
        returning id
      `;
      const [resource] = await tx<{ id: string }[]>`
        with gen as (select uuid_generate_v4() as id)
        insert into rentable_resources (
          id, organization_id, property_id, root_id, label, resource_type, rental_mode
        )
        select gen.id, ${input.organizationId}, ${property!.id}, gen.id, ${input.resource.label},
               ${input.resource.resourceType}, ${input.resource.rentalMode}
          from gen
        returning id
      `;

      const l = input.listing;
      const [listing] = await tx<{ id: string }[]>`
        insert into listings (
          organization_id, resource_id, kind, title, description, price_centavos,
          amenities, house_rules, terms, min_stay_nights, advance_months, deposit_months,
          max_occupants, bedrooms, bathrooms, floor_area_sqm, cleaning_fee_centavos,
          available_from, state
        ) values (
          ${input.organizationId}, ${resource!.id}, ${l.kind}, ${l.title.trim()}, ${l.description.trim()},
          ${l.priceCentavos}, ${textArray(tx, l.amenities)}, ${textArray(tx, l.houseRules)},
          ${textArray(tx, l.terms)}, ${l.minStayNights}, ${l.advanceMonths}, ${l.depositMonths},
          ${l.maxOccupants}, ${l.bedrooms}, ${l.bathrooms}, ${l.floorAreaSqm}, ${l.cleaningFeeCentavos},
          ${l.availableFrom}, 'DRAFT'
        )
        returning id
      `;
      const created = await loadOne(tx, input.organizationId, listing!.id);
      return created!;
    });
  },

  async updateListing(input: UpdateListingInput) {
    return withScope(input.organizationId, async (tx) => {
      const current = await loadOne(tx, input.organizationId, input.listingId);
      if (!current) return null;

      const l = input.listing;
      await tx`
        update listings set
          kind = coalesce(${l.kind ?? null}, kind),
          title = coalesce(${l.title?.trim() ?? null}, title),
          description = coalesce(${l.description?.trim() ?? null}, description),
          price_centavos = coalesce(${l.priceCentavos ?? null}, price_centavos),
          amenities = ${l.amenities ? textArray(tx, l.amenities) : tx`amenities`},
          house_rules = ${l.houseRules ? textArray(tx, l.houseRules) : tx`house_rules`},
          terms = ${l.terms ? textArray(tx, l.terms) : tx`terms`},
          min_stay_nights = ${l.minStayNights !== undefined ? l.minStayNights : tx`min_stay_nights`},
          advance_months = coalesce(${l.advanceMonths ?? null}, advance_months),
          deposit_months = coalesce(${l.depositMonths ?? null}, deposit_months),
          max_occupants = coalesce(${l.maxOccupants ?? null}, max_occupants),
          bedrooms = coalesce(${l.bedrooms ?? null}, bedrooms),
          bathrooms = coalesce(${l.bathrooms ?? null}, bathrooms),
          floor_area_sqm = ${l.floorAreaSqm !== undefined ? l.floorAreaSqm : tx`floor_area_sqm`},
          cleaning_fee_centavos = coalesce(${l.cleaningFeeCentavos ?? null}, cleaning_fee_centavos),
          available_from = ${l.availableFrom !== undefined ? l.availableFrom : tx`available_from`},
          updated_at = now()
        where id = ${input.listingId} and organization_id = ${input.organizationId}
      `;

      const p = input.property;
      if (p && current.propertyId) {
        await tx`
          update properties set
            name = coalesce(${p.name?.trim() ?? null}, name),
            property_type = coalesce(${p.propertyType ?? null}, property_type),
            address_line = coalesce(${p.addressLine?.trim() ?? null}, address_line),
            area_label = coalesce(${p.areaLabel?.trim() ?? null}, area_label),
            city_label = coalesce(${p.cityLabel?.trim() ?? null}, city_label)
          where id = ${current.propertyId} and organization_id = ${input.organizationId}
        `;
      }
      if (l.kind && l.kind !== current.kind) {
        await tx`
          update rentable_resources set rental_mode = ${l.kind}
           where id = ${current.resourceId} and organization_id = ${input.organizationId}
             and rental_mode <> 'HYBRID'
        `;
      }

      return loadOne(tx, input.organizationId, input.listingId);
    });
  },

  async addPhoto(organizationId: string, listingId: string, photo: NewListingPhoto) {
    return withScope(organizationId, async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtext(${'listing-media:' + listingId}))`;
      const [existing] = await tx<MediaRow[]>`
        select id, storage_url as url, storage_path as path, position
          from media_assets
         where storage_path = ${photo.storagePath} and organization_id = ${organizationId}
      `;
      if (existing) return { id: existing.id, url: existing.url, storagePath: existing.path, position: existing.position };

      const [inserted] = await tx<MediaRow[]>`
        insert into media_assets (
          organization_id, listing_id, kind, storage_url, storage_path, content_type, size_bytes, position
        )
        select ${organizationId}, ${listingId}, 'PHOTO', ${photo.url}, ${photo.storagePath},
               ${photo.contentType}, ${photo.sizeBytes},
               coalesce(max(position) + 1, 0)
          from media_assets
         where listing_id = ${listingId} and organization_id = ${organizationId} and kind = 'PHOTO'
        returning id, storage_url as url, storage_path as path, position
      `;
      await tx`update listings set updated_at = now() where id = ${listingId}`;
      return {
        id: inserted!.id,
        url: inserted!.url,
        storagePath: inserted!.path,
        position: inserted!.position,
      };
    });
  },

  async removePhoto(organizationId: string, listingId: string, photoId: string) {
    return withScope(organizationId, async (tx) => {
      const removed = await tx<{ storage_path: string | null }[]>`
        delete from media_assets
         where id = ${photoId} and listing_id = ${listingId} and organization_id = ${organizationId}
           and kind = 'PHOTO'
        returning storage_path
      `;
      if (removed.length === 0) return null;
      await tx`
        with ordered as (
          select id, row_number() over (order by position, created_at) - 1 as pos
            from media_assets
           where listing_id = ${listingId} and organization_id = ${organizationId} and kind = 'PHOTO'
        )
        update media_assets m set position = ordered.pos from ordered where m.id = ordered.id
      `;
      await tx`update listings set updated_at = now() where id = ${listingId}`;
      return { storagePath: removed[0]!.storage_path };
    });
  },

  async reorderPhotos(organizationId: string, listingId: string, photoIds: readonly string[]) {
    await withScope(organizationId, async (tx) => {
      await tx`
        update media_assets m
           set position = ordered.pos - 1
          from unnest(${tx.array([...photoIds])}::uuid[]) with ordinality as ordered(id, pos)
         where m.id = ordered.id and m.listing_id = ${listingId} and m.organization_id = ${organizationId}
      `;
      await tx`update listings set updated_at = now() where id = ${listingId}`;
    });
  },

  async setListingState(organizationId: string, listingId: string, state: ListingState) {
    return withScope(organizationId, async (tx) => {
      await tx`
        update listings
           set state = ${state},
               updated_at = now(),
               published_at = case when ${state} = 'PUBLISHED' then coalesce(published_at, now()) else published_at end
         where organization_id = ${organizationId} and id = ${listingId}
      `;
      return loadOne(tx, organizationId, listingId);
    });
  },

  async isOrganizationVerified(organizationId: string) {
    return withScope(organizationId, async (tx) => {
      const [row] = await tx<{ state: string }[]>`select state from organizations where id = ${organizationId}`;
      return row?.state === 'VERIFIED';
    });
  },

  async listResources(organizationId: string): Promise<readonly OrganizationResource[]> {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<ResourceRow[]>`
        select
          r.id, r.property_id, p.name as property_name,
          p.area_label, p.city_label, r.label,
          r.resource_type, r.rental_mode
        from rentable_resources r
        join properties p on p.id = r.property_id
        where r.organization_id = ${organizationId}
          and r.state = 'ACTIVE'
        order by p.name asc, r.label asc
      `;
      return rows.map((r) => ({
        id: r.id,
        propertyId: r.property_id,
        propertyName: r.property_name,
        areaLabel: r.area_label,
        cityLabel: r.city_label,
        label: r.label,
        resourceType: r.resource_type as ResourceType,
        rentalMode: r.rental_mode,
      }));
    });
  },

  async listProperties(organizationId: string): Promise<readonly OwnerProperty[]> {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<{
        id: string;
        name: string;
        property_type: string;
        address_line: string;
        area_label: string;
        city_label: string;
        resource_count: number;
        listing_count: number;
        published_count: number;
        cover_photo: string | null;
      }[]>`
        select p.id, p.name, p.property_type, p.address_line, p.area_label, p.city_label,
               (select count(*)::int from rentable_resources r where r.property_id = p.id) as resource_count,
               (select count(*)::int from listings l join rentable_resources r on r.id = l.resource_id
                 where r.property_id = p.id and l.state <> 'ARCHIVED') as listing_count,
               (select count(*)::int from listings l join rentable_resources r on r.id = l.resource_id
                 where r.property_id = p.id and l.state = 'PUBLISHED') as published_count,
               (select m.storage_url from media_assets m
                  join listings l on l.id = m.listing_id
                  join rentable_resources r on r.id = l.resource_id
                 where r.property_id = p.id and m.kind = 'PHOTO'
                 order by m.position limit 1) as cover_photo
          from properties p
         where p.organization_id = ${organizationId}
         order by p.created_at desc
      `;
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        propertyType: r.property_type as PropertyType,
        addressLine: r.address_line,
        areaLabel: r.area_label,
        cityLabel: r.city_label,
        resourceCount: r.resource_count,
        listingCount: r.listing_count,
        publishedCount: r.published_count,
        coverPhoto: r.cover_photo,
      }));
    });
  },

  async stayPricing(listingId: string): Promise<StayPricingSource | null> {
    return withScope(null, async (tx) => {
      const [row] = await tx<{
        id: string;
        organization_id: string;
        resource_id: string;
        price_centavos: string;
        cleaning_fee_centavos: string;
        min_stay_nights: number | null;
        max_occupants: number;
      }[]>`
        select id, organization_id, resource_id, price_centavos::text, cleaning_fee_centavos::text,
               min_stay_nights, max_occupants
          from listings
         where id = ${listingId} and state = 'PUBLISHED' and kind = 'SHORT_TERM'
      `;
      if (!row) return null;
      return {
        listingId: row.id,
        organizationId: row.organization_id,
        resourceId: row.resource_id,
        nightlyCentavos: centavos(Number(row.price_centavos)),
        cleaningFeeCentavos: centavos(Number(row.cleaning_fee_centavos)),
        minStayNights: row.min_stay_nights ?? 1,
        maxOccupants: row.max_occupants,
      };
    });
  },
});
