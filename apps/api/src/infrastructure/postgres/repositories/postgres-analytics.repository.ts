import type postgres from 'postgres';
import type {
  AnalyticsRepository,
  ListingPerformance,
  PartnerAnalytics,
  WeeklyCount,
} from '@/application/ports/repositories/analytics-repository.port.ts';
import { INQUIRY_STATUSES, type InquiryStatus } from '@/domain/inquiries/inquiry.ts';
import type { ViewingStatus } from '@/domain/viewings/viewing.ts';
import { withScope, withUser } from '@/infrastructure/postgres/db.ts';

const VIEWING_STATUSES: readonly ViewingStatus[] = [
  'REQUESTED',
  'CONFIRMED',
  'RESCHEDULE_REQUESTED',
  'COMPLETED',
  'CANCELLED',
];

const zeroes = <K extends string>(keys: readonly K[]): Record<K, number> =>
  Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;

async function collect(
  tx: postgres.TransactionSql,
  scope: { organizationId: string } | { agent: true },
  since: Date,
): Promise<PartnerAnalytics> {
  const inquiryScope =
    'organizationId' in scope ? tx`i.organization_id = ${scope.organizationId}` : tx`i.agent_id = app_private.current_app_agent()`;
  const viewingScope =
    'organizationId' in scope ? tx`v.organization_id = ${scope.organizationId}` : tx`v.agent_id = app_private.current_app_agent()`;

  const inquiryRows = await tx<{ status: InquiryStatus; n: number }[]>`
    select i.status, count(*)::int as n from inquiries i where ${inquiryScope} group by i.status
  `;
  const viewingRows = await tx<{ status: ViewingStatus; n: number }[]>`
    select v.status, count(*)::int as n from viewings v where ${viewingScope} group by v.status
  `;

  const listingScope =
    'organizationId' in scope
      ? tx`l.organization_id = ${scope.organizationId} and l.state <> 'ARCHIVED'`
      : tx`exists (select 1 from listing_representations r
                    where r.listing_id = l.id and r.state = 'ACTIVE'
                      and r.agent_id = app_private.current_app_agent())`;

  const listingRows = await tx<{
    id: string;
    title: string;
    intent: string;
    state: string;
    inquiries: number;
    viewings: number;
    bookings: number;
    conversations: number;
  }[]>`
    select l.id, l.title, l.intent, l.state,
      (select count(*)::int from inquiries i where i.listing_id = l.id and ${inquiryScope}) as inquiries,
      (select count(*)::int from viewings v where v.listing_id = l.id and ${viewingScope}) as viewings,
      ${
        'organizationId' in scope
          ? tx`(select count(*)::int from occupancies o
                 where o.resource_id = l.resource_id and o.kind = 'BOOKING' and o.state = 'COMMITTED')`
          : tx`0`
      } as bookings,
      (select count(*)::int from conversations c where c.listing_id = l.id and c.last_message_at is not null
         ${'organizationId' in scope ? tx`` : tx`and c.agent_id = app_private.current_app_agent()`}) as conversations
    from listings l
    where ${listingScope}
    order by l.updated_at desc
    limit 100
  `;

  const weeklyRows = await tx<{ week_start: string; inquiries: number; viewings: number; bookings: number }[]>`
    with weeks as (
      select generate_series(date_trunc('week', ${since}::timestamptz), date_trunc('week', now()), interval '1 week') as week_start
    )
    select to_char(w.week_start, 'YYYY-MM-DD') as week_start,
      (select count(*)::int from inquiries i
        where ${inquiryScope} and i.created_at >= w.week_start and i.created_at < w.week_start + interval '1 week') as inquiries,
      (select count(*)::int from viewings v
        where ${viewingScope} and v.created_at >= w.week_start and v.created_at < w.week_start + interval '1 week') as viewings,
      ${
        'organizationId' in scope
          ? tx`(select count(*)::int from occupancies o
                 where o.organization_id = ${scope.organizationId} and o.kind = 'BOOKING' and o.state = 'COMMITTED'
                   and o.created_at >= w.week_start and o.created_at < w.week_start + interval '1 week')`
          : tx`0`
      } as bookings
    from weeks w
    order by w.week_start
  `;

  const inquiriesByStatus = zeroes(INQUIRY_STATUSES);
  for (const row of inquiryRows) inquiriesByStatus[row.status] = row.n;
  const viewingsByStatus = zeroes(VIEWING_STATUSES);
  for (const row of viewingRows) viewingsByStatus[row.status] = row.n;

  return {
    inquiriesByStatus,
    viewingsByStatus,
    weekly: weeklyRows.map<WeeklyCount>((row) => ({
      weekStart: row.week_start,
      inquiries: row.inquiries,
      viewings: row.viewings,
      bookings: row.bookings,
    })),
    listings: listingRows.map<ListingPerformance>((row) => ({
      listingId: row.id,
      title: row.title,
      intent: row.intent === 'SALE' ? 'SALE' : 'RENT',
      state: row.state,
      inquiries: row.inquiries,
      viewings: row.viewings,
      bookings: row.bookings,
      conversations: row.conversations,
    })),
  };
}

export const postgresAnalyticsRepository = (): AnalyticsRepository => ({
  async forOrganization(organizationId, since) {
    return withScope(organizationId, (tx) => collect(tx, { organizationId }, since));
  },
  async forAgent(agentUserId, since) {
    return withUser(agentUserId, (tx) => collect(tx, { agent: true }, since));
  },
});
