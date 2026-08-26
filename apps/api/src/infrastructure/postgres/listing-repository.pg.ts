import type { ListingRepository } from '../../application/ports/listing-repository.ts';
import type {
  Listing,
  ListingKind,
  ListingQuery,
  ListingState,
  ResourceType,
} from '../../domain/listings/listing.ts';
import { centavos } from '../../domain/shared/money.ts';
import type { OrganizationId } from '../../domain/shared/organization-scope.ts';
import { sql, withScope } from './db.ts';

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
});
