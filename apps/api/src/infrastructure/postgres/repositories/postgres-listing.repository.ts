import type postgres from 'postgres';
import type {
  AreaSummary,
  CreateListingInput,
  CreatePropertyListingInput,
  CreateSaleListingInput,
  ListingRepository,
  NewListingPhoto,
  OrganizationResource,
  OwnerProperty,
  PropertyDetails,
  SaleTerms,
  SaleTermsInput,
  StayPricingSource,
  UpdateListingInput,
  UpdateSaleListingInput,
} from '@/application/ports/repositories/listing-repository.port.ts';
import type {
  Furnishing,
  Listing,
  ListingFloorPlan,
  ListingIntent,
  ListingKind,
  ListingPhoto,
  ListingQuery,
  ListingState,
  PropertyType,
  ResourceType,
  SaleStatus,
} from '@/domain/listings/listing.ts';
import { centavos } from '@/domain/shared/money.ts';
import { boundingBox, roundDistanceKm, type LocationPrivacy } from '@/domain/shared/geo.ts';
import type { OrganizationId } from '@/domain/shared/organization-scope.ts';
import { escapeLike, sql, withScope, withUser } from '@/infrastructure/postgres/db.ts';


interface MediaRow {
  id: string;
  url: string;
  path: string | null;
  position: number;
  label?: string;
}

interface Row {
  id: string;
  organization_id: string;
  resource_id: string;
  property_id: string;
  intent: string;
  kind: string | null;
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
  sale_status: string | null;
  lot_area_sqm: number | null;
  parking_slots: number;
  latitude: number | null;
  longitude: number | null;
  location_privacy: string;
  public_latitude: number | null;
  public_longitude: number | null;
  floor_plans: MediaRow[] | null;
  tour_provider: string | null;
  furnishing: string | null;
  pets_allowed: boolean | null;
  distance_km?: number | null;
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
    intent: row.intent as ListingIntent,
    kind: row.kind as ListingKind | null,
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
    tourProvider: row.tour_state === 'PUBLISHED' ? 'PLATFORM' : null,
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
    saleStatus: row.sale_status as SaleStatus | null,
    lotAreaSqm: row.lot_area_sqm,
    parkingSlots: row.parking_slots,
    furnishing: row.furnishing as Furnishing | null,
    petsAllowed: row.pets_allowed,
    location:
      row.latitude !== null && row.longitude !== null
        ? { latitude: row.latitude, longitude: row.longitude, privacy: row.location_privacy as LocationPrivacy }
        : null,
    publicLocation:
      row.public_latitude !== null && row.public_longitude !== null
        ? { latitude: row.public_latitude, longitude: row.public_longitude }
        : null,
    distanceKm:
      row.distance_km === undefined || row.distance_km === null ? null : roundDistanceKm(Number(row.distance_km)),
    floorPlans: [...(row.floor_plans ?? [])]
      .sort((a, b) => a.position - b.position)
      .map<ListingFloorPlan>((m) => ({
        id: m.id,
        url: m.url,
        storagePath: m.path,
        position: m.position,
        label: m.label ?? '',
      })),
  };
};

const SELECT = sql`
  select
    l.id, l.organization_id, l.resource_id, l.intent, l.kind, l.title, l.description,
    l.sale_status, l.lot_area_sqm, l.parking_slots, l.furnishing, l.pets_allowed,
    p.latitude, p.longitude, p.location_privacy,
    case when p.latitude is null then null
         when p.location_privacy = 'EXACT' then p.latitude
         else round(p.latitude::numeric, 2)::float8 end as public_latitude,
    case when p.longitude is null then null
         when p.location_privacy = 'EXACT' then p.longitude
         else round(p.longitude::numeric, 2)::float8 end as public_longitude,
    t.provider as tour_provider,
    coalesce(
      (select json_agg(json_build_object(
                'id', m.id, 'url', m.storage_url, 'path', m.storage_path, 'position', m.position, 'label', m.label
              ) order by m.position, m.created_at)
         from media_assets m
        where m.listing_id = l.id and m.kind = 'FLOOR_PLAN' and m.representation_id is null),
      '[]'::json
    ) as floor_plans,
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
        where m.listing_id = l.id and m.kind = 'PHOTO' and m.representation_id is null),
      '[]'::json
    ) as media,
    case
      when l.intent = 'SALE' then null
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


async function insertProperty(
  tx: postgres.TransactionSql,
  organizationId: string,
  property: PropertyDetails,
): Promise<{ id: string }> {
  const location = property.location ?? null;
  const [row] = await tx<{ id: string }[]>`
    insert into properties (
      organization_id, name, property_type, address_line, area_label, city_label,
      latitude, longitude, location_privacy
    )
    values (
      ${organizationId}, ${property.name.trim()}, ${property.propertyType},
      ${property.addressLine.trim()}, ${property.areaLabel.trim()}, ${property.cityLabel.trim()},
      ${location?.latitude ?? null}, ${location?.longitude ?? null}, ${location?.privacy ?? 'APPROXIMATE'}
    )
    returning id
  `;
  return row!;
}

async function updateProperty(
  tx: postgres.TransactionSql,
  organizationId: string,
  propertyId: string,
  p: Partial<PropertyDetails>,
): Promise<void> {
  await tx`
    update properties set
      name = coalesce(${p.name?.trim() ?? null}, name),
      property_type = coalesce(${p.propertyType ?? null}, property_type),
      address_line = coalesce(${p.addressLine?.trim() ?? null}, address_line),
      area_label = coalesce(${p.areaLabel?.trim() ?? null}, area_label),
      city_label = coalesce(${p.cityLabel?.trim() ?? null}, city_label)
    where id = ${propertyId} and organization_id = ${organizationId}
  `;
  if (p.location !== undefined) {
    await tx`
      update properties set
        latitude = ${p.location?.latitude ?? null},
        longitude = ${p.location?.longitude ?? null},
        location_privacy = ${p.location?.privacy ?? 'APPROXIMATE'}
      where id = ${propertyId} and organization_id = ${organizationId}
    `;
  }
}

interface SaleTermsRow {
  listing_id: string;
  asking_price_internal_centavos: string | null;
  price_negotiable: boolean;
  commercial_notes: string;
  updated_at: Date | null;
}

const toSaleTerms = (row: SaleTermsRow): SaleTerms => ({
  listingId: row.listing_id,
  askingPriceInternalCentavos:
    row.asking_price_internal_centavos === null ? null : Number(row.asking_price_internal_centavos),
  priceNegotiable: row.price_negotiable,
  commercialNotes: row.commercial_notes,
  updatedAt: row.updated_at,
});

async function upsertSaleTerms(
  tx: postgres.TransactionSql,
  organizationId: string,
  listingId: string,
  terms: SaleTermsInput,
  updatedBy: string,
): Promise<SaleTerms> {
  const [row] = await tx<SaleTermsRow[]>`
    insert into listing_sale_terms (
      listing_id, organization_id, asking_price_internal_centavos, price_negotiable, commercial_notes, updated_by, updated_at
    ) values (
      ${listingId}, ${organizationId}, ${terms.askingPriceInternalCentavos}, ${terms.priceNegotiable},
      ${terms.commercialNotes.trim()}, ${updatedBy}, now()
    )
    on conflict (listing_id) do update set
      asking_price_internal_centavos = excluded.asking_price_internal_centavos,
      price_negotiable = excluded.price_negotiable,
      commercial_notes = excluded.commercial_notes,
      updated_by = excluded.updated_by,
      updated_at = now()
    returning listing_id, asking_price_internal_centavos::text, price_negotiable, commercial_notes, updated_at
  `;
  return toSaleTerms(row!);
}

export const postgresListingRepository = (): ListingRepository => ({
  async search(_scope, query: ListingQuery) {
    return withScope(null, async (tx) => {
      const text = query.text ? `%${escapeLike(query.text)}%` : null;
      const area = query.area ? `%${escapeLike(query.area)}%` : null;
      const amenity = query.amenity ? `%${escapeLike(query.amenity)}%` : null;
      const city = query.city ? query.city : null;
      const near = query.near ?? null;
      const box = near ? boundingBox(near, near.radiusKm) : null;
      const priceFiltered = query.minPriceCentavos !== undefined || query.maxPriceCentavos !== undefined;
      const sort = query.sort ?? (near ? 'DISTANCE' : 'NEWEST');
      const order =
        sort === 'PRICE_ASC'
          ? tx`order by (ranked.intent = 'SALE'), ranked.price_centavos::bigint asc, ranked.published_at desc nulls last`
          : sort === 'PRICE_DESC'
            ? tx`order by (ranked.intent = 'SALE'), ranked.price_centavos::bigint desc, ranked.published_at desc nulls last`
            : sort === 'DISTANCE' && near
              ? tx`order by ranked.distance_km asc nulls last, ranked.published_at desc nulls last, ranked.id`
              : tx`order by ranked.published_at desc nulls last, ranked.id`;

      const distance = near
        ? tx`2 * 6371.0088 * asin(least(1, sqrt(
              power(sin(radians(base.public_latitude - ${near.latitude}) / 2), 2)
              + cos(radians(${near.latitude})) * cos(radians(base.public_latitude))
              * power(sin(radians(base.public_longitude - ${near.longitude}) / 2), 2))))`
        : tx`null::float8`;

      const rows = await tx<Row[]>`
        with base as (
          ${SELECT}
          where l.state = 'PUBLISHED'
            ${query.ids ? tx`and l.id = any(${tx.array([...query.ids])}::uuid[])` : tx``}
            ${query.intent ? tx`and l.intent = ${query.intent}` : tx``}
            ${query.saleStatus ? tx`and l.sale_status = ${query.saleStatus}` : tx``}
            ${query.kind ? tx`and l.kind = ${query.kind}` : tx``}
            ${query.resourceType ? tx`and r.resource_type = ${query.resourceType}` : tx``}
            ${query.propertyType ? tx`and p.property_type = ${query.propertyType}` : tx``}
            ${city ? tx`and p.city_label ilike ${city}` : tx``}
            ${query.hasTour ? tx`and t.state = 'PUBLISHED'` : tx``}
            ${query.guests !== undefined ? tx`and l.intent = 'RENT' and l.max_occupants >= ${query.guests}` : tx``}
            ${query.bedrooms !== undefined ? tx`and l.bedrooms >= ${query.bedrooms}` : tx``}
            ${query.bathrooms !== undefined ? tx`and l.bathrooms >= ${query.bathrooms}` : tx``}
            ${query.minFloorAreaSqm !== undefined ? tx`and l.floor_area_sqm >= ${query.minFloorAreaSqm}` : tx``}
            ${query.furnished ? tx`and l.furnishing in ('FURNISHED', 'SEMI_FURNISHED')` : tx``}
            ${query.petsAllowed ? tx`and l.pets_allowed` : tx``}
            ${area ? tx`and p.area_label ilike ${area}` : tx``}
            ${amenity ? tx`and exists (select 1 from unnest(l.amenities) as amenity(label) where amenity.label ilike ${amenity})` : tx``}
            ${priceFiltered ? tx`and l.intent = 'RENT'` : tx``}
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
              box
                ? tx`and p.latitude is not null
                     and point(p.longitude, p.latitude) <@ box(
                       point(${box.minLongitude - 0.02}, ${box.minLatitude - 0.02}),
                       point(${box.maxLongitude + 0.02}, ${box.maxLatitude + 0.02}))`
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
                ? tx`and l.intent = 'RENT' and not exists (
                      select 1 from occupancies o3
                       where o3.root_id = r.root_id
                         and o3.subtree && r.subtree
                         and (o3.state = 'COMMITTED' or (o3.state = 'HELD' and o3.expires_at > now()))
                         and o3.during && daterange(${query.availableFrom}::date, ${query.availableTo}::date, '[)')
                    )
                    and (l.available_from is null or l.available_from <= ${query.availableFrom}::date)`
                : query.availableFrom
                  ? tx`and l.intent = 'RENT' and (l.available_from is null or l.available_from <= ${query.availableFrom}::date)`
                  : tx``
            }
        ),
        ranked as (
          select base.*, ${distance} as distance_km from base
        )
        select ranked.*, count(*) over ()::text as total_count
          from ranked
         ${near ? tx`where ranked.distance_km <= ${near.radiusKm}` : tx``}
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
      const property = await insertProperty(tx, input.organizationId, input.property);
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
          available_from, furnishing, pets_allowed, state
        ) values (
          ${input.organizationId}, ${resource!.id}, ${l.kind}, ${l.title.trim()}, ${l.description.trim()},
          ${l.priceCentavos}, ${textArray(tx, l.amenities)}, ${textArray(tx, l.houseRules)},
          ${textArray(tx, l.terms)}, ${l.minStayNights}, ${l.advanceMonths}, ${l.depositMonths},
          ${l.maxOccupants}, ${l.bedrooms}, ${l.bathrooms}, ${l.floorAreaSqm}, ${l.cleaningFeeCentavos},
          ${l.availableFrom}, ${l.furnishing ?? null}, ${l.petsAllowed ?? null}, 'DRAFT'
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
          furnishing = ${l.furnishing !== undefined ? l.furnishing : tx`furnishing`},
          pets_allowed = ${l.petsAllowed !== undefined ? l.petsAllowed : tx`pets_allowed`},
          updated_at = now()
        where id = ${input.listingId} and organization_id = ${input.organizationId}
      `;

      if (input.property && current.propertyId) {
        await updateProperty(tx, input.organizationId, current.propertyId, input.property);
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

  async saleDuplicateCandidates(query) {
    return withScope(null, async (tx) => {
      const rows = await tx<
        {
          listing_id: string;
          organization_id: string;
          property_name: string;
          address_line: string;
          area_label: string;
          city_label: string;
          property_type: string;
          latitude: number | null;
          longitude: number | null;
          bedrooms: number;
          bathrooms: number;
          floor_area_sqm: number | null;
          lot_area_sqm: number | null;
        }[]
      >`
        select * from app_private.sale_listing_duplicate_candidates(
          ${query.cityLabel}, ${query.propertyType},
          ${query.location?.latitude ?? null}::float8, ${query.location?.longitude ?? null}::float8,
          ${query.radiusMeters}::float8
        )
      `;
      return rows.map((row) => ({
        listingId: row.listing_id,
        organizationId: row.organization_id,
        name: row.property_name,
        addressLine: row.address_line,
        areaLabel: row.area_label,
        cityLabel: row.city_label,
        propertyType: row.property_type,
        location:
          row.latitude !== null && row.longitude !== null ? { latitude: row.latitude, longitude: row.longitude } : null,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        floorAreaSqm: row.floor_area_sqm,
        lotAreaSqm: row.lot_area_sqm,
      }));
    });
  },

  async createSaleListing(input: CreateSaleListingInput) {
    return withScope(input.organizationId, async (tx) => {
      const property = await insertProperty(tx, input.organizationId, input.property);
      const [resource] = await tx<{ id: string }[]>`
        with gen as (select uuid_generate_v4() as id)
        insert into rentable_resources (
          id, organization_id, property_id, root_id, label, resource_type, rental_mode
        )
        select gen.id, ${input.organizationId}, ${property.id}, gen.id, ${input.property.name.trim()}, 'UNIT', 'SALE'
          from gen
        returning id
      `;
      const l = input.listing;
      const [listing] = await tx<{ id: string }[]>`
        insert into listings (
          organization_id, resource_id, intent, kind, title, description, price_centavos,
          amenities, house_rules, terms, min_stay_nights, advance_months, deposit_months,
          max_occupants, bedrooms, bathrooms, floor_area_sqm, cleaning_fee_centavos,
          available_from, sale_status, lot_area_sqm, parking_slots, furnishing, state, possible_duplicate_of
        ) values (
          ${input.organizationId}, ${resource!.id}, 'SALE', null, ${l.title.trim()}, ${l.description.trim()}, 0,
          ${textArray(tx, l.amenities)}, ${textArray(tx, [])}, ${textArray(tx, [])}, null, 0, 0,
          1, ${l.bedrooms}, ${l.bathrooms}, ${l.floorAreaSqm}, 0,
          ${l.availableFrom}, ${l.saleStatus}, ${l.lotAreaSqm}, ${l.parkingSlots}, ${l.furnishing ?? null}, 'DRAFT',
          ${input.possibleDuplicateOf}
        )
        returning id
      `;
      if (input.saleTerms) {
        await upsertSaleTerms(tx, input.organizationId, listing!.id, input.saleTerms, input.updatedBy);
      }
      const created = await loadOne(tx, input.organizationId, listing!.id);
      return created!;
    });
  },

  async updateSaleListing(input: UpdateSaleListingInput) {
    return withScope(input.organizationId, async (tx) => {
      const current = await loadOne(tx, input.organizationId, input.listingId);
      if (!current || current.intent !== 'SALE') return null;
      const l = input.listing;
      await tx`
        update listings set
          title = coalesce(${l.title?.trim() ?? null}, title),
          description = coalesce(${l.description?.trim() ?? null}, description),
          amenities = ${l.amenities ? textArray(tx, l.amenities) : tx`amenities`},
          sale_status = coalesce(${l.saleStatus ?? null}, sale_status),
          bedrooms = coalesce(${l.bedrooms ?? null}, bedrooms),
          bathrooms = coalesce(${l.bathrooms ?? null}, bathrooms),
          floor_area_sqm = ${l.floorAreaSqm !== undefined ? l.floorAreaSqm : tx`floor_area_sqm`},
          lot_area_sqm = ${l.lotAreaSqm !== undefined ? l.lotAreaSqm : tx`lot_area_sqm`},
          parking_slots = coalesce(${l.parkingSlots ?? null}, parking_slots),
          available_from = ${l.availableFrom !== undefined ? l.availableFrom : tx`available_from`},
          furnishing = ${l.furnishing !== undefined ? l.furnishing : tx`furnishing`},
          updated_at = now()
        where id = ${input.listingId} and organization_id = ${input.organizationId} and intent = 'SALE'
      `;
      if (input.property && current.propertyId) {
        await updateProperty(tx, input.organizationId, current.propertyId, input.property);
        if (input.property.name) {
          await tx`
            update rentable_resources set label = ${input.property.name.trim()}
             where id = ${current.resourceId} and organization_id = ${input.organizationId}
          `;
        }
      }
      return loadOne(tx, input.organizationId, input.listingId);
    });
  },

  async saleTerms(organizationId: string, listingId: string) {
    return withScope(organizationId, async (tx) => {
      const [row] = await tx<SaleTermsRow[]>`
        select listing_id, asking_price_internal_centavos::text, price_negotiable, commercial_notes, updated_at
          from listing_sale_terms
         where listing_id = ${listingId} and organization_id = ${organizationId}
      `;
      return row ? toSaleTerms(row) : null;
    });
  },

  async saveSaleTerms(organizationId: string, listingId: string, terms: SaleTermsInput, updatedBy: string) {
    return withScope(organizationId, (tx) => upsertSaleTerms(tx, organizationId, listingId, terms, updatedBy));
  },

  async areas(): Promise<readonly AreaSummary[]> {
    return withScope(null, async (tx) => {
      const rows = await tx<{
        city_label: string;
        latitude: number;
        longitude: number;
        listing_count: number;
        rent_count: number;
        sale_count: number;
      }[]>`
        select p.city_label,
               avg(case when p.location_privacy = 'EXACT' then p.latitude else round(p.latitude::numeric, 2)::float8 end) as latitude,
               avg(case when p.location_privacy = 'EXACT' then p.longitude else round(p.longitude::numeric, 2)::float8 end) as longitude,
               count(*)::int as listing_count,
               count(*) filter (where l.intent = 'RENT')::int as rent_count,
               count(*) filter (where l.intent = 'SALE')::int as sale_count
          from listings l
          join rentable_resources r on r.id = l.resource_id
          join properties p on p.id = r.property_id
         where l.state = 'PUBLISHED' and p.latitude is not null and btrim(p.city_label) <> ''
         group by p.city_label
         order by count(*) desc, p.city_label
         limit 60
      `;
      return rows.map((row) => ({
        cityLabel: row.city_label,
        latitude: Math.round(Number(row.latitude) * 1000) / 1000,
        longitude: Math.round(Number(row.longitude) * 1000) / 1000,
        listingCount: row.listing_count,
        rentCount: row.rent_count,
        saleCount: row.sale_count,
      }));
    });
  },

  async addFloorPlan(organizationId: string, listingId: string, media: NewListingPhoto, label: string) {
    return withScope(organizationId, async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtext(${'listing-media:' + listingId}))`;
      const [existing] = await tx<MediaRow[]>`
        select id, storage_url as url, storage_path as path, position, label
          from media_assets
         where storage_path = ${media.storagePath} and organization_id = ${organizationId}
      `;
      if (existing) {
        return { id: existing.id, url: existing.url, storagePath: existing.path, position: existing.position, label: existing.label ?? '' };
      }
      const [inserted] = await tx<MediaRow[]>`
        insert into media_assets (
          organization_id, listing_id, kind, storage_url, storage_path, content_type, size_bytes, position, label
        )
        select ${organizationId}, ${listingId}, 'FLOOR_PLAN', ${media.url}, ${media.storagePath},
               ${media.contentType}, ${media.sizeBytes}, coalesce(max(position) + 1, 0), ${label}
          from media_assets
         where listing_id = ${listingId} and organization_id = ${organizationId} and kind = 'FLOOR_PLAN'
        returning id, storage_url as url, storage_path as path, position, label
      `;
      await tx`update listings set updated_at = now() where id = ${listingId}`;
      return {
        id: inserted!.id,
        url: inserted!.url,
        storagePath: inserted!.path,
        position: inserted!.position,
        label: inserted!.label ?? label,
      };
    });
  },

  async removeFloorPlan(organizationId: string, listingId: string, floorPlanId: string) {
    return withScope(organizationId, async (tx) => {
      const removed = await tx<{ storage_path: string | null }[]>`
        delete from media_assets
         where id = ${floorPlanId} and listing_id = ${listingId} and organization_id = ${organizationId}
           and kind = 'FLOOR_PLAN'
        returning storage_path
      `;
      if (removed.length === 0) return null;
      await tx`update listings set updated_at = now() where id = ${listingId}`;
      return { storagePath: removed[0]!.storage_path };
    });
  },

  async findRepresented(agentUserId: string, listingId: string) {
    return withUser(agentUserId, async (tx) => {
      const rows = await tx<Row[]>`
        ${SELECT}
        where l.id = ${listingId}
          and exists (
            select 1 from listing_representations rp
             where rp.listing_id = l.id
               and rp.state in ('PENDING', 'ACTIVE')
               and rp.agent_id = app_private.current_app_agent()
          )
        limit 1
      `;
      return rows[0] ? toListing(rows[0]) : null;
    });
  },
});
