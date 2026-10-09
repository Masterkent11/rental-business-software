import type { DiscoveryRepository } from '@/application/ports/repositories/discovery-repository.port.ts';
import type { InterestKind, InterestSignal } from '@/domain/discovery/recommendation.ts';
import type { ListingIntent, PropertyType } from '@/domain/listings/listing-state.ts';
import { escapeLike, withScope, withUser } from '@/infrastructure/postgres/db.ts';


const PUBLIC_LISTINGS = `
  listings l
  join rentable_resources r on r.id = l.resource_id
  join properties p on p.id = r.property_id
`;

export const postgresDiscoveryRepository = (): DiscoveryRepository => ({
  async suggestLocations(text, intent, limit) {
    const pattern = `%${escapeLike(text)}%`;
    return withScope(null, async (tx) => {
      const rows = await tx<{ city_label: string; area_label: string | null; listing_count: number }[]>`
        select city_label, area_label, listing_count from (
          select p.city_label, null::text as area_label, count(*)::int as listing_count
            from ${tx.unsafe(PUBLIC_LISTINGS)}
           where l.state = 'PUBLISHED'
             ${intent ? tx`and l.intent = ${intent}` : tx``}
             and p.city_label ilike ${pattern}
           group by p.city_label
          union all
          select p.city_label, p.area_label, count(*)::int as listing_count
            from ${tx.unsafe(PUBLIC_LISTINGS)}
           where l.state = 'PUBLISHED'
             ${intent ? tx`and l.intent = ${intent}` : tx``}
             and p.area_label ilike ${pattern}
           group by p.city_label, p.area_label
        ) as matches
        order by listing_count desc, city_label, area_label nulls first
        limit ${limit}
      `;
      return rows.map((row) => ({ cityLabel: row.city_label, areaLabel: row.area_label, listingCount: row.listing_count }));
    });
  },

  async suggestListings(text, intent, limit) {
    const pattern = `%${escapeLike(text)}%`;
    return withScope(null, async (tx) => {
      const rows = await tx<{ id: string; title: string; intent: ListingIntent; area_label: string; city_label: string }[]>`
        select l.id, l.title, l.intent, p.area_label, p.city_label
          from ${tx.unsafe(PUBLIC_LISTINGS)}
         where l.state = 'PUBLISHED'
           ${intent ? tx`and l.intent = ${intent}` : tx``}
           and (l.title ilike ${pattern} or p.name ilike ${pattern})
         order by l.published_at desc nulls last, l.id
         limit ${limit}
      `;
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        intent: row.intent,
        areaLabel: row.area_label,
        cityLabel: row.city_label,
      }));
    });
  },

  async popularAreas(query) {
    return withScope(null, async (tx) => {
      const rows = await tx<{ area_label: string; city_label: string; listing_count: number; cover_photo_url: string | null }[]>`
        with matching as (
          select l.id, l.published_at, p.area_label, p.city_label
            from ${tx.unsafe(PUBLIC_LISTINGS)}
           where l.state = 'PUBLISHED'
             ${query.intent ? tx`and l.intent = ${query.intent}` : tx``}
             ${query.city ? tx`and p.city_label ilike ${escapeLike(query.city)}` : tx``}
        ),
        grouped as (
          select area_label, city_label, count(*)::int as listing_count
            from matching
           group by area_label, city_label
        )
        select g.area_label, g.city_label, g.listing_count,
               (select m.storage_url
                  from matching mt
                  join media_assets m on m.listing_id = mt.id and m.kind = 'PHOTO'
                 where mt.area_label = g.area_label and mt.city_label = g.city_label
                 order by mt.published_at desc nulls last, m.position
                 limit 1) as cover_photo_url
          from grouped g
         order by g.listing_count desc, g.city_label, g.area_label
         limit ${query.limit}
      `;
      return rows.map((row) => ({
        areaLabel: row.area_label,
        cityLabel: row.city_label,
        listingCount: row.listing_count,
        coverPhotoUrl: row.cover_photo_url,
      }));
    });
  },

  async nearestCity(origin, maxDistanceKm) {
    return withScope(null, async (tx) => {
      const rows = await tx<{ city_label: string; distance_km: number }[]>`
        select p.city_label,
               min(2 * 6371.0088 * asin(least(1, sqrt(
                 power(sin(radians(p.latitude - ${origin.latitude}) / 2), 2)
                 + cos(radians(${origin.latitude})) * cos(radians(p.latitude))
                 * power(sin(radians(p.longitude - ${origin.longitude}) / 2), 2))))) as distance_km
          from ${tx.unsafe(PUBLIC_LISTINGS)}
         where l.state = 'PUBLISHED' and p.latitude is not null and p.longitude is not null
         group by p.city_label
         order by distance_km asc
         limit 1
      `;
      const row = rows[0];
      if (!row || Number(row.distance_km) > maxDistanceKm) return null;
      return { cityLabel: row.city_label, distanceKm: Math.round(Number(row.distance_km) * 10) / 10 };
    });
  },

  async interestSignals(userId, since) {
    return withUser(userId, async (tx) => {
      const rows = await tx<{ kind: InterestKind; intent: ListingIntent; property_type: PropertyType | null; area_label: string; city_label: string }[]>`
        with signals as (
          select 'SAVE'::text as kind, s.listing_id from saved_listings s
           where s.user_id = ${userId} and s.saved_at >= ${since}
          union all
          select 'INQUIRY', i.listing_id from inquiries i
           where i.customer_id = ${userId} and i.created_at >= ${since}
          union all
          select 'VIEWING_REQUEST', v.listing_id from viewings v
           where v.customer_id = ${userId} and v.created_at >= ${since}
          union all
          select 'VIEW', e.listing_id from listing_view_events e
           where e.user_id = ${userId} and e.viewed_at >= ${since}
        )
        select s.kind, l.intent, p.property_type, p.area_label, p.city_label
          from signals s
          join ${tx.unsafe(PUBLIC_LISTINGS)} on l.id = s.listing_id
         where l.state = 'PUBLISHED'
      `;
      return rows.map<InterestSignal>((row) => ({
        kind: row.kind,
        intent: row.intent,
        propertyType: row.property_type,
        areaLabel: row.area_label,
        cityLabel: row.city_label,
      }));
    });
  },

  async recordListingView(userId, listingId) {
    return withUser(userId, async (tx) => {
      const inserted = await tx<{ id: string }[]>`
        insert into listing_view_events (user_id, listing_id)
        select ${userId}, l.id
          from listings l
         where l.id = ${listingId} and l.state = 'PUBLISHED'
           and not exists (
             select 1 from listing_view_events e
              where e.user_id = ${userId} and e.listing_id = l.id and e.viewed_at > now() - interval '1 hour'
           )
        returning id
      `;
      return inserted.length > 0;
    });
  },
});
