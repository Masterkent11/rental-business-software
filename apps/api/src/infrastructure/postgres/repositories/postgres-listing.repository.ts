import type {
  CreateListingInput,
  ListingRepository,
  OrganizationResource,
} from '@/application/ports/repositories/listing-repository.port.ts';
import type {
  Listing,
  ListingKind,
  ListingQuery,
  ListingState,
  ResourceType,
} from '@/domain/listings/listing.ts';
import { centavos } from '@/domain/shared/money.ts';
import type { OrganizationId } from '@/domain/shared/organization-scope.ts';
import { sql, withScope } from '@/infrastructure/postgres/db.ts';

/**
 * Postgres implementation of the listing port.
 *
 * All SQL lives here. The domain never sees a row, and the application never
 * sees a query — which is what makes swapping the platform four adapter
 * rewrites rather than a rebuild.
 */

interface Row {
  id: string;
  organization_id: string;
  resource_id: string;
  kind: string;
  resource_type: string;
  title: string;
  description: string;
  property_name: string;
  area_label: string;
  city_label: string;
  price_centavos: string;
  state: string;
  scene_count: number | null;
  tour_state: string | null;
  photos: string[] | null;
  amenities: string[] | null;
  house_rules: string[] | null;
  terms: string[] | null;
  min_stay_nights: number | null;
  advance_months: number;
  deposit_months: number;
  shared_facilities: string[] | null;
  owner_name: string;
  owner_state: string;
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

const toListing = (row: Row): Listing => ({
  id: row.id,
  organizationId: row.organization_id as OrganizationId,
  resourceId: row.resource_id,
  kind: row.kind as ListingKind,
  resourceType: row.resource_type as ResourceType,
  title: row.title,
  description: row.description,
  propertyName: row.property_name,
  areaLabel: row.area_label,
  cityLabel: row.city_label,
  // bigint arrives as a string from the driver. Parsing it here rather than
  // letting it reach the domain as a string is the adapter doing its job.
  priceCentavos: centavos(Number(row.price_centavos)),
  state: row.state as ListingState,
  hasTour: row.tour_state === 'PUBLISHED',
  sceneCount: row.scene_count ?? 0,
  photos: row.photos ?? [],
  amenities: row.amenities ?? [],
  houseRules: row.house_rules ?? [],
  terms: row.terms ?? [],
  minStayNights: row.min_stay_nights,
  advanceMonths: row.advance_months,
  depositMonths: row.deposit_months,
  sharedFacilities: row.shared_facilities ?? [],
  ownerName: row.owner_name,
  // D-11: only a verified organization may publish, so a published listing's
  // owner is verified by construction. Carried explicitly rather than inferred,
  // because "evidence is never inferred" (P-07).
  ownerVerified: row.owner_state === 'VERIFIED',
});

const SELECT = sql`
  select
    l.id, l.organization_id, l.resource_id, l.kind, l.title, l.description,
    l.price_centavos, l.state,
    l.amenities, l.house_rules, l.terms, l.min_stay_nights,
    l.advance_months, l.deposit_months,
    r.resource_type, r.shared_facilities,
    o.trading_name as owner_name, o.state as owner_state,
    p.name as property_name, p.area_label, p.city_label,
    t.state as tour_state, t.scene_count,
    coalesce(
      (select array_agg(m.storage_url order by m.position)
         from media_assets m
        where m.listing_id = l.id and m.kind = 'PHOTO'),
      '{}'
    ) as photos
  from listings l
  join rentable_resources r on r.id = l.resource_id
  join properties p on p.id = r.property_id
  join organizations o on o.id = l.organization_id
  left join virtual_tours t on t.resource_id = r.id
`;

export const postgresListingRepository = (): ListingRepository => ({
  async search(_scope, query: ListingQuery) {
    // The marketplace read crosses organizations by design, so no scope is
    // set — the RLS policy admits published rows to everyone and nothing else.
    return withScope(null, async (tx) => {
      const rows = await tx<Row[]>`
        ${SELECT}
        where l.state = 'PUBLISHED'
          ${query.ids ? tx`and l.id = any(${tx.array([...query.ids])}::uuid[])` : tx``}
          ${query.kind ? tx`and l.kind = ${query.kind}` : tx``}
          ${query.resourceType ? tx`and r.resource_type = ${query.resourceType}` : tx``}
          ${query.hasTour ? tx`and t.state = 'PUBLISHED'` : tx``}
          ${
            query.maxPriceCentavos !== undefined
              ? tx`and l.price_centavos <= ${query.maxPriceCentavos}`
              : tx``
          }
          ${
            query.text
              ? tx`and (
                    l.title ilike ${'%' + query.text + '%'}
                 or p.name ilike ${'%' + query.text + '%'}
                 or p.area_label ilike ${'%' + query.text + '%'}
                 or p.city_label ilike ${'%' + query.text + '%'}
                  )`
              : tx``
          }
        order by l.created_at desc
        limit ${query.limit} offset ${query.offset}
      `;
      return rows.map(toListing);
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
        order by l.created_at desc
      `;
      return rows.map(toListing);
    });
  },

  async findById(organizationId: string, id: string) {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<Row[]>`
        ${SELECT}
        where l.organization_id = ${organizationId}
          and l.id = ${id}
        limit 1
      `;
      const row = rows[0];
      return row ? toListing(row) : null;
    });
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
          ${tx.array([...input.amenities])}, ${tx.array([...input.houseRules])},
          ${tx.array([...input.terms])}, ${input.minStayNights},
          ${input.advanceMonths}, ${input.depositMonths}, 'PUBLISHED'
        )
        on conflict (resource_id, kind) where state <> 'ARCHIVED'
        do update set
          title = excluded.title,
          description = excluded.description,
          price_centavos = excluded.price_centavos,
          amenities = excluded.amenities,
          house_rules = excluded.house_rules,
          terms = excluded.terms,
          min_stay_nights = excluded.min_stay_nights,
          advance_months = excluded.advance_months,
          deposit_months = excluded.deposit_months,
          state = 'PUBLISHED'
        returning id
      `;
      const listingId = inserted[0]!.id;

      if (input.photos && input.photos.length > 0) {
        for (let i = 0; i < input.photos.length; i++) {
          const photoUrl = input.photos[i]!;
          await tx`
            insert into media_assets (
              organization_id, listing_id, kind, storage_url, position
            ) values (
              ${input.organizationId}, ${listingId}, 'PHOTO', ${photoUrl}, ${i}
            )
          `;
        }
      }

      const rows = await tx<Row[]>`
        ${SELECT} where l.id = ${listingId} limit 1
      `;
      return toListing(rows[0]!);
    });
  },

  async addPhoto(organizationId: string, listingId: string, storageUrl: string) {
    await withScope(organizationId, async (tx) => {
      const countRes = await tx<{ count: string }[]>`
        select count(*)::text from media_assets
        where organization_id = ${organizationId} and listing_id = ${listingId} and kind = 'PHOTO'
      `;
      const position = Number(countRes[0]?.count ?? '0');
      await tx`
        insert into media_assets (
          organization_id, listing_id, kind, storage_url, position
        ) values (
          ${organizationId}, ${listingId}, 'PHOTO', ${storageUrl}, ${position}
        )
      `;
    });
  },

  async setListingState(organizationId: string, listingId: string, state: ListingState) {
    return withScope(organizationId, async (tx) => {
      await tx`
        update listings
        set state = ${state}
        where organization_id = ${organizationId} and id = ${listingId}
      `;
      const rows = await tx<Row[]>`
        ${SELECT} where l.id = ${listingId} and l.organization_id = ${organizationId} limit 1
      `;
      const row = rows[0];
      return row ? toListing(row) : null;
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
});
