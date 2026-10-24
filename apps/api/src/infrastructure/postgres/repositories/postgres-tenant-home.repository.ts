import { withUser } from '@/infrastructure/postgres/db.ts';
import type { TenantHomeRepository } from '@/application/ports/repositories/tenant-home-repository.port.ts';
import type { TenantHome, TenantInvoice } from '@/domain/occupancy/tenant-home.ts';

interface HomeRow {
  id: string; tenant_id: string; kind: string; state: string; starts_on: string | null; ends_on: string | null;
  property_id: string; listing_id: string | null; title: string; unit: string; address: string; area: string;
  property_type: string; description: string; photos: string[]; amenities: string[]; rules: string[];
  latitude: number | null; longitude: number | null; landlord_name: string;
}

export function postgresTenantHomeRepository(): TenantHomeRepository {
  return {
    async activityForCustomer(userId) {
      return withUser(userId, async tx => {
        const [row] = await tx<{ trips: boolean; pending: number; approved: number }[]>`
          select exists(select 1 from occupancies where held_by = ${userId} and kind = 'BOOKING') as trips,
            (select count(*)::int from applications where applicant_id = ${userId} and state in ('SUBMITTED','UNDER_REVIEW')) as pending,
            (select count(*)::int from applications a where a.applicant_id = ${userId} and a.state = 'APPROVED'
              and not exists (select 1 from occupancies o where o.application_id = a.id and o.kind = 'LEASE'
                and o.state in ('COMMITTED','RELEASED','CANCELLED'))) as approved
        `;
        return { hasTrips: row?.trips ?? false, pendingApplications: row?.pending ?? 0, approvedApplications: row?.approved ?? 0 };
      });
    },
    async listForCustomer(userId) {
      return withUser(userId, async tx => {
        const homes = await tx<HomeRow[]>`
          select o.id, o.held_by as tenant_id, o.kind, o.state,
            lower(o.during)::text as starts_on, upper(o.during)::text as ends_on,
            p.id as property_id, l.id as listing_id, p.name as title, r.label as unit,
            concat_ws(', ', nullif(p.address_line, ''), p.area_label, p.city_label) as address,
            p.area_label as area, p.property_type, coalesce(l.description, '') as description,
            coalesce(l.amenities, '{}') as amenities, coalesce(l.house_rules, '{}') as rules,
            p.latitude, p.longitude, org.trading_name as landlord_name,
            coalesce((select json_agg(m.storage_url order by m.position, m.id)
              from media_assets m where m.listing_id = l.id and m.kind = 'PHOTO'), '[]') as photos
          from occupancies o join rentable_resources r on r.id = o.resource_id and r.organization_id = o.organization_id
          join properties p on p.id = r.property_id and p.organization_id = o.organization_id
          join organizations org on org.id = o.organization_id
          left join lateral (select id, description, amenities, house_rules from listings
            where resource_id = r.id and organization_id = o.organization_id and kind = 'LONG_TERM'
            order by (state <> 'ARCHIVED') desc, created_at desc, id limit 1) l on true
          where o.held_by = ${userId} and o.kind = 'LEASE' and o.state in ('COMMITTED','RELEASED','CANCELLED')
          order by lower(o.during), o.id
        `;
        if (!homes.length) return [];
        const invoices = await tx<{ occupancy_id: string; id: string; number: number; due_on: string;
          total_centavos: string; amount_paid_centavos: string; state: string;
          lines: { description: string; amountCentavos: number }[] }[]>`
          select i.occupancy_id, i.id, i.number, i.due_on::text, i.total_centavos, i.amount_paid_centavos, i.state,
            coalesce((select json_agg(json_build_object('description', il.description,
              'amountCentavos', il.amount_centavos) order by il.position)
              from invoice_lines il where il.invoice_id = i.id), '[]') as lines
          from invoices i join occupancies o on o.id = i.occupancy_id
          where i.tenant_id = ${userId} and o.held_by = ${userId}
            and i.occupancy_id in ${tx(homes.map(home => home.id))} and i.state not in ('DRAFT', 'VOIDED')
          order by i.due_on, i.id
        `;
        return homes.map((row): TenantHome => ({
          id: row.id, tenantId: row.tenant_id, kind: row.kind, state: row.state,
          startsOn: row.starts_on, endsOn: row.ends_on, propertyId: row.property_id, listingId: row.listing_id,
          title: row.title, unit: row.unit, address: row.address, area: row.area, propertyType: row.property_type,
          description: row.description, photos: row.photos, amenities: row.amenities, rules: row.rules,
          latitude: row.latitude, longitude: row.longitude, landlordName: row.landlord_name,
          invoices: invoices.filter(invoice => invoice.occupancy_id === row.id).map((invoice): TenantInvoice => ({
            id: invoice.id, number: invoice.number, dueOn: invoice.due_on, totalCentavos: Number(invoice.total_centavos),
            paidCentavos: Number(invoice.amount_paid_centavos), outstandingCentavos: Number(invoice.total_centavos) - Number(invoice.amount_paid_centavos),
            state: invoice.state, onlinePaymentAvailable: false, lines: invoice.lines,
          })),
        }));
      });
    },
  };
}
