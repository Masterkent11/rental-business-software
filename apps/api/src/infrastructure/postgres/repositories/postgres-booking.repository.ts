import type postgres from 'postgres';
import {
  BlockConflictError,
  type AvailabilityBlock,
  type BookingRepository,
  type BookingSummary,
} from '@/application/ports/repositories/booking-repository.port.ts';
import type { StayState } from '@/domain/bookings/booking.ts';
import { nightsIn } from '@/domain/occupancy/occupancy.ts';
import { sql, withScope, withUser } from '@/infrastructure/postgres/db.ts';

const EXCLUSION_VIOLATION = '23P01';

interface BookingRow {
  id: string;
  stay_id: string | null;
  organization_id: string;
  listing_id: string | null;
  listing_title: string | null;
  property_name: string;
  resource_label: string;
  area_label: string;
  city_label: string;
  photo: string | null;
  guest_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guests: number | null;
  starts_on: string;
  ends_on: string;
  nights: number;
  occupancy_state: string;
  stay_state: string | null;
  paid_centavos: string | null;
  payment_state: string | null;
  paid_at: Date | null;
  expires_at: Date | null;
  conversation_id: string | null;
  created_at: Date;
  total_count?: string;
}

const toSummary = (row: BookingRow): BookingSummary => ({
  id: row.id,
  reference: (row.stay_id ?? row.id).replace(/-/g, '').slice(0, 8).toUpperCase(),
  organizationId: row.organization_id,
  listingId: row.listing_id,
  listingTitle: row.listing_title ?? row.resource_label,
  propertyName: row.property_name,
  resourceLabel: row.resource_label,
  areaLabel: row.area_label,
  cityLabel: row.city_label,
  photo: row.photo,
  guestId: row.guest_id,
  guestName: row.guest_name?.trim() || row.guest_email?.split('@')[0] || 'Guest',
  guestEmail: row.guest_email,
  guests: row.guests,
  startsOn: row.starts_on,
  endsOn: row.ends_on,
  nights: row.nights,
  occupancyState: row.occupancy_state,
  stayState: (row.stay_state as StayState | null) ?? null,
  paidCentavos: row.paid_centavos ? Number(row.paid_centavos) : 0,
  paymentState: row.payment_state,
  paidAt: row.paid_at,
  holdExpiresAt: row.occupancy_state === 'HELD' ? row.expires_at : null,
  conversationId: row.conversation_id,
  createdAt: row.created_at,
});

const SELECT = (tx: postgres.TransactionSql) => tx`
  select
    o.id,
    s.id as stay_id,
    o.organization_id,
    l.id as listing_id,
    l.title as listing_title,
    p.name as property_name,
    r.label as resource_label,
    p.area_label,
    p.city_label,
    (select m.storage_url from media_assets m
      where m.listing_id = l.id and m.kind = 'PHOTO'
      order by m.position limit 1) as photo,
    o.held_by as guest_id,
    u.display_name as guest_name,
    u.email as guest_email,
    o.guests,
    to_char(lower(o.during), 'YYYY-MM-DD') as starts_on,
    to_char(upper(o.during), 'YYYY-MM-DD') as ends_on,
    (upper(o.during) - lower(o.during))::int as nights,
    case when o.state = 'HELD' and o.expires_at <= now() then 'EXPIRED' else o.state end as occupancy_state,
    s.state as stay_state,
    pay.amount_centavos::text as paid_centavos,
    pay.state as payment_state,
    pay.received_at as paid_at,
    o.expires_at,
    (select c.id from conversations c
      where c.listing_id = l.id and c.customer_id = o.held_by
      limit 1) as conversation_id,
    o.created_at
  from occupancies o
  join rentable_resources r on r.id = o.resource_id
  join properties p on p.id = r.property_id
  left join listings l on l.resource_id = o.resource_id and l.kind = 'SHORT_TERM'
  left join stays s on s.occupancy_id = o.id
  left join user_profiles u on u.id = o.held_by
  left join lateral (
    select pp.amount_centavos, pp.state, pp.received_at
      from payments pp
     where pp.occupancy_id = o.id
     order by (pp.state = 'SUCCEEDED') desc, pp.recorded_at desc
     limit 1
  ) pay on true
`;

const BUCKET_FILTER = (tx: postgres.TransactionSql, bucket: string | undefined) => {
  switch (bucket) {
    case 'UPCOMING':
      return tx`and s.state = 'CONFIRMED' and lower(o.during) > (now() at time zone 'Asia/Manila')::date`;
    case 'CURRENT':
      return tx`and s.state in ('CONFIRMED','IN_PROGRESS') and lower(o.during) <= (now() at time zone 'Asia/Manila')::date and upper(o.during) > (now() at time zone 'Asia/Manila')::date`;
    case 'PAST':
      return tx`and s.id is not null and (s.state = 'COMPLETED' or upper(o.during) <= (now() at time zone 'Asia/Manila')::date) and s.state <> 'CANCELLED'`;
    case 'CANCELLED':
      return tx`and (s.state = 'CANCELLED' or o.state = 'CANCELLED')`;
    case 'PENDING_PAYMENT':
      return tx`and s.id is null and o.state = 'HELD' and o.expires_at > now()`;
    default:
      return tx``;
  }
};

export const postgresBookingRepository = (): BookingRepository => ({
  async forOrganization(query) {
    return withScope(query.organizationId, async (tx) => {
      const text = query.text ? `%${query.text}%` : null;
      const rows = await tx<BookingRow[]>`
        with base as (
          ${SELECT(tx)}
          where o.organization_id = ${query.organizationId}
            and o.kind = 'BOOKING'
            and (s.id is not null or (o.state = 'HELD' and o.expires_at > now()))
            ${BUCKET_FILTER(tx, query.bucket)}
            ${
              text
                ? tx`and (l.title ilike ${text} or p.name ilike ${text} or u.display_name ilike ${text} or u.email ilike ${text})`
                : tx``
            }
        )
        select base.*, count(*) over ()::text as total_count
          from base
         order by base.starts_on desc, base.created_at desc
         limit ${query.limit} offset ${query.offset}
      `;
      return {
        items: rows.map(toSummary),
        total: rows[0]?.total_count ? Number(rows[0].total_count) : 0,
      };
    });
  },

  async findForOrganization(organizationId, bookingId) {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<BookingRow[]>`
        ${SELECT(tx)}
        where o.organization_id = ${organizationId} and o.id = ${bookingId} and o.kind = 'BOOKING'
        limit 1
      `;
      return rows[0] ? toSummary(rows[0]) : null;
    });
  },

  async forGuest(userId) {
    return withUser(userId, async (tx) => {
      const rows = await tx<BookingRow[]>`
        ${SELECT(tx)}
        where o.held_by = ${userId}
          and o.kind = 'BOOKING'
          and (s.id is not null or (o.state = 'HELD' and o.expires_at > now()))
        order by lower(o.during) desc, o.created_at desc
        limit 100
      `;
      return rows.map(toSummary);
    });
  },

  async findForGuest(userId, bookingId) {
    return withUser(userId, async (tx) => {
      const rows = await tx<BookingRow[]>`
        ${SELECT(tx)}
        where o.held_by = ${userId} and (o.id = ${bookingId} or s.id = ${bookingId}) and o.kind = 'BOOKING'
        limit 1
      `;
      return rows[0] ? toSummary(rows[0]) : null;
    });
  },

  async setStayState(organizationId, bookingId, state) {
    await withScope(organizationId, async (tx) => {
      await tx`
        update stays set state = ${state}, updated_at = now()
         where occupancy_id = ${bookingId} and organization_id = ${organizationId}
      `;
    });
  },

  async blocksFor(organizationId, resourceId) {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<{ id: string; resource_id: string; starts_on: string; ends_on: string; note: string | null }[]>`
        select id, resource_id,
               to_char(lower(during), 'YYYY-MM-DD') as starts_on,
               to_char(upper(during), 'YYYY-MM-DD') as ends_on,
               note
          from occupancies
         where organization_id = ${organizationId}
           and resource_id = ${resourceId}
           and kind = 'BLOCK'
           and state = 'COMMITTED'
           and upper(during) > (now() at time zone 'Asia/Manila')::date
         order by lower(during)
      `;
      return rows.map<AvailabilityBlock>((row) => ({
        id: row.id,
        resourceId: row.resource_id,
        during: { startsOn: row.starts_on, endsOn: row.ends_on },
        note: row.note,
      }));
    });
  },

  async addBlock(input) {
    try {
      return await sql.begin(async (tx) => {
        await tx`set transaction isolation level serializable`;
        await tx`select set_config('app.organization_id', ${input.organizationId}, true)`;
        const [resource] = await tx<{ root_id: string }[]>`
          select root_id from rentable_resources
           where id = ${input.resourceId} and organization_id = ${input.organizationId}
        `;
        if (!resource) throw new BlockConflictError('That place could not be found');
        await tx`select pg_advisory_xact_lock(hashtext(${resource.root_id}))`;
        await tx`
          update occupancies set state = 'EXPIRED'
           where root_id = ${resource.root_id} and state = 'HELD' and expires_at <= now()
        `;
        const [row] = await tx<{ id: string }[]>`
          insert into occupancies (
            organization_id, resource_id, root_id, subtree, during, kind, state, note
          )
          select r.organization_id, r.id, r.root_id, r.subtree,
                 daterange(${input.during.startsOn}::date, ${input.during.endsOn}::date, '[)'),
                 'BLOCK', 'COMMITTED', ${input.note}
            from rentable_resources r
           where r.id = ${input.resourceId}
          returning id
        `;
        const nights = nightsIn(input.during);
        if (nights.length > 0) {
          await tx`
            insert into resource_night_status (organization_id, resource_id, night, status)
            select ${input.organizationId}, ${input.resourceId}, unnest(${tx.array([...nights])}::date[]), 'BLOCKED'
            on conflict (resource_id, night) do update set status = excluded.status
          `;
        }
        return {
          id: row!.id,
          resourceId: input.resourceId,
          during: input.during,
          note: input.note,
        };
      });
    } catch (error) {
      if ((error as postgres.PostgresError | undefined)?.code === EXCLUSION_VIOLATION) {
        throw new BlockConflictError('Those dates already have a booking or block');
      }
      throw error;
    }
  },

  async removeBlock(organizationId, blockId) {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<{ resource_id: string; starts_on: string; ends_on: string }[]>`
        update occupancies set state = 'CANCELLED'
         where id = ${blockId} and organization_id = ${organizationId}
           and kind = 'BLOCK' and state = 'COMMITTED'
        returning resource_id,
                  to_char(lower(during), 'YYYY-MM-DD') as starts_on,
                  to_char(upper(during), 'YYYY-MM-DD') as ends_on
      `;
      const row = rows[0];
      if (!row) return false;
      const nights = nightsIn({ startsOn: row.starts_on, endsOn: row.ends_on });
      if (nights.length > 0) {
        await tx`
          delete from resource_night_status
           where resource_id = ${row.resource_id}
             and status = 'BLOCKED'
             and night = any(${tx.array([...nights])}::date[])
        `;
      }
      return true;
    });
  },
});
