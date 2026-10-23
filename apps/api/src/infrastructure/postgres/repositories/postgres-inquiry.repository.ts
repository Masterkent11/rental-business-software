import { InquiryNotFoundError, nextInquiryStatus, statusAfterPartnerReply } from '@/domain/inquiries/inquiry.ts';
import type postgres from 'postgres';
import type {
  ClientSummary,
  InquiryFilters,
  InquiryRepository,
  NewInquiry,
} from '@/application/ports/repositories/inquiry-repository.port.ts';
import type { PartyScope } from '@/application/ports/repositories/party-scope.port.ts';
import type { Inquiry, InquiryStatus } from '@/domain/inquiries/inquiry.ts';
import { withScope, withUser } from '@/infrastructure/postgres/db.ts';

interface InquiryRow {
  id: string;
  organization_id: string;
  organization_name: string;
  listing_id: string;
  listing_title: string | null;
  listing_photo: string | null;
  area_label: string | null;
  city_label: string | null;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  agent_id: string | null;
  agent_name: string | null;
  conversation_id: string;
  status: string;
  message: string;
  questions: string[] | null;
  buyer_budget_centavos: string | null;
  lost_reason: string | null;
  created_at: Date;
  updated_at: Date;
  status_changed_at: Date;
  first_response_at: Date | null;
}

const SELECT = (tx: postgres.TransactionSql) => tx`
  select
    i.id, i.organization_id, o.trading_name as organization_name,
    i.listing_id, l.title as listing_title,
    (select m.storage_url from media_assets m
      where m.listing_id = i.listing_id and m.kind = 'PHOTO'
      order by m.position limit 1) as listing_photo,
    p.area_label, p.city_label,
    i.customer_id, u.display_name as customer_name, u.email as customer_email,
    i.agent_id, a.display_name as agent_name,
    i.conversation_id, i.status, i.message, i.questions,
    i.buyer_budget_centavos::text as buyer_budget_centavos,
    i.lost_reason, i.created_at, i.updated_at, i.status_changed_at, i.first_response_at
  from inquiries i
  join organizations o on o.id = i.organization_id
  left join listings l on l.id = i.listing_id
  left join rentable_resources rr on rr.id = l.resource_id
  left join properties p on p.id = rr.property_id
  left join user_profiles u on u.id = i.customer_id
  left join agent_profiles a on a.id = i.agent_id
`;

const toInquiry = (row: InquiryRow): Inquiry => ({
  id: row.id,
  organizationId: row.organization_id,
  organizationName: row.organization_name,
  listingId: row.listing_id,
  listingTitle: row.listing_title ?? 'Listing no longer available',
  listingPhoto: row.listing_photo,
  areaLabel: row.area_label ?? '',
  cityLabel: row.city_label ?? '',
  customerId: row.customer_id,
  customerName: row.customer_name?.trim() || row.customer_email?.split('@')[0] || 'Customer',
  agentId: row.agent_id,
  agentName: row.agent_id ? row.agent_name?.trim() || 'Agent' : null,
  conversationId: row.conversation_id,
  status: row.status as InquiryStatus,
  message: row.message,
  questions: row.questions ?? [],
  buyerBudgetCentavos: row.buyer_budget_centavos === null ? null : Number(row.buyer_budget_centavos),
  lostReason: row.lost_reason,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  statusChangedAt: row.status_changed_at,
  firstResponseAt: row.first_response_at,
});

function inScope<T>(scope: PartyScope, work: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  if ('customerId' in scope) return withUser(scope.customerId, work);
  if ('agentUserId' in scope) return withUser(scope.agentUserId, work);
  return withScope(scope.organizationId, work);
}

const scopeFilter = (tx: postgres.TransactionSql, scope: PartyScope) => {
  if ('customerId' in scope) return tx`and i.customer_id = ${scope.customerId}`;
  if ('agentUserId' in scope) return tx`and i.agent_id = app_private.current_app_agent()`;
  return tx`and i.organization_id = ${scope.organizationId}`;
};

const filtersFor = (tx: postgres.TransactionSql, filters: InquiryFilters) => tx`
  ${filters.status ? tx`and i.status = ${filters.status}` : tx``}
  ${filters.listingId ? tx`and i.listing_id = ${filters.listingId}` : tx``}
`;

async function lockStatus(tx: postgres.TransactionSql, scope: PartyScope, id: string): Promise<InquiryStatus | null> {
  const [row] = await tx<{ status: InquiryStatus }[]>`select i.status from inquiries i
    where i.id = ${id} ${scopeFilter(tx, scope)} for update`;
  return row?.status ?? null;
}

const UNIQUE_VIOLATION = '23505';

async function loadOne(tx: postgres.TransactionSql, id: string): Promise<Inquiry | null> {
  const [row] = await tx<InquiryRow[]>`${SELECT(tx)} where i.id = ${id}`;
  return row ? toInquiry(row) : null;
}

export const postgresInquiryRepository = (): InquiryRepository => ({
  async submit(input: NewInquiry) {
    const attempt = () =>
      withUser(input.customerId, async (tx) => {
        const [byRef] = await tx<{ id: string }[]>`
          select id from inquiries where customer_id = ${input.customerId} and client_ref = ${input.clientRef}
        `;
        if (byRef) return { inquiry: (await loadOne(tx, byRef.id))!, created: false, alreadyOpen: false };

        const [open] = await tx<{ id: string }[]>`
          select id from inquiries
           where listing_id = ${input.listingId} and customer_id = ${input.customerId}
             and status not in ('CLOSED', 'LOST')
        `;
        if (open) return { inquiry: (await loadOne(tx, open.id))!, created: false, alreadyOpen: true };

        const [conversation] = await tx<{ id: string }[]>`
          insert into conversations (organization_id, listing_id, customer_id, agent_id)
          values (${input.organizationId}, ${input.listingId}, ${input.customerId}, ${input.agentId})
          on conflict (listing_id, customer_id) do update
            set agent_id = coalesce(excluded.agent_id, conversations.agent_id)
          returning id
        `;

        const [message] = await tx<{ created_at: Date }[]>`
          insert into messages (organization_id, conversation_id, sender_id, sender_role, body, client_id)
          values (${input.organizationId}, ${conversation!.id}, ${input.customerId}, 'CUSTOMER',
                  ${input.opening}, ${input.clientRef})
          on conflict (conversation_id, client_id) do nothing
          returning created_at
        `;
        if (message) {
          await tx`
            update conversations
               set last_message_at = ${message.created_at},
                   last_message_preview = ${input.openingPreview},
                   last_sender_role = 'CUSTOMER',
                   customer_last_read_at = ${message.created_at}
             where id = ${conversation!.id}
          `;
        }

        const [inserted] = await tx<{ id: string }[]>`
          insert into inquiries (
            organization_id, listing_id, customer_id, agent_id, conversation_id,
            message, questions, buyer_budget_centavos, client_ref
          ) values (
            ${input.organizationId}, ${input.listingId}, ${input.customerId}, ${input.agentId},
            ${conversation!.id}, ${input.message}, ${tx.array([...input.questions])},
            ${input.buyerBudgetCentavos}, ${input.clientRef}
          )
          returning id
        `;
        return { inquiry: (await loadOne(tx, inserted!.id))!, created: true, alreadyOpen: false };
      });

    try {
      return await attempt();
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) return attempt();
      throw error;
    }
  },

  async findForCustomer(customerId, id) {
    return withUser(customerId, async (tx) => {
      const [row] = await tx<InquiryRow[]>`${SELECT(tx)} where i.id = ${id} and i.customer_id = ${customerId}`;
      return row ? toInquiry(row) : null;
    });
  },

  async listForCustomer(customerId) {
    return withUser(customerId, async (tx) => {
      const rows = await tx<InquiryRow[]>`
        ${SELECT(tx)} where i.customer_id = ${customerId} order by i.created_at desc limit 100
      `;
      return rows.map(toInquiry);
    });
  },

  async openForCustomerListing(customerId, listingId) {
    return withUser(customerId, async (tx) => {
      const [row] = await tx<InquiryRow[]>`
        ${SELECT(tx)}
        where i.customer_id = ${customerId} and i.listing_id = ${listingId}
          and i.status not in ('CLOSED', 'LOST')
        limit 1
      `;
      return row ? toInquiry(row) : null;
    });
  },

  async findForOrganization(organizationId, id) {
    return withScope(organizationId, async (tx) => {
      const [row] = await tx<InquiryRow[]>`
        ${SELECT(tx)} where i.id = ${id} and i.organization_id = ${organizationId}
      `;
      return row ? toInquiry(row) : null;
    });
  },

  async listForOrganization(organizationId, filters) {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<InquiryRow[]>`
        ${SELECT(tx)}
        where i.organization_id = ${organizationId} ${filtersFor(tx, filters)}
        order by i.updated_at desc
        limit 300
      `;
      return rows.map(toInquiry);
    });
  },

  async findForAgent(agentUserId, id) {
    return withUser(agentUserId, async (tx) => {
      const [row] = await tx<InquiryRow[]>`
        ${SELECT(tx)} where i.id = ${id} and i.agent_id = app_private.current_app_agent()
      `;
      return row ? toInquiry(row) : null;
    });
  },

  async listForAgent(agentUserId, filters) {
    return withUser(agentUserId, async (tx) => {
      const rows = await tx<InquiryRow[]>`
        ${SELECT(tx)}
        where i.agent_id = app_private.current_app_agent() ${filtersFor(tx, filters)}
        order by i.updated_at desc
        limit 300
      `;
      return rows.map(toInquiry);
    });
  },

  async setStatus(scope, id, status, lostReason) {
    return inScope(scope, async (tx) => {
      const current = await lockStatus(tx, scope, id);
      if (!current) throw new InquiryNotFoundError('Inquiry not found');
      nextInquiryStatus(current, status);
      await tx`
        update inquiries i set
          status = ${status},
          lost_reason = ${status === 'LOST' ? lostReason : null},
          status_changed_at = now(),
          updated_at = now()
        where i.id = ${id} ${scopeFilter(tx, scope)}
      `;
      return (await loadOne(tx, id))!;
    });
  },

  async openForConversation(scope, conversationId) {
    return inScope(scope, async (tx) => {
      const [row] = await tx<InquiryRow[]>`
        ${SELECT(tx)}
        where i.conversation_id = ${conversationId} and i.status not in ('CLOSED', 'LOST')
          ${scopeFilter(tx, scope)}
        order by i.created_at desc
        limit 1
      `;
      return row ? toInquiry(row) : null;
    });
  },

  async recordFirstResponse(scope, id, at) {
    await inScope(scope, async (tx) => {
      const current = await lockStatus(tx, scope, id);
      if (!current) return;
      const status = statusAfterPartnerReply(current);
      await tx`
        update inquiries i set
          first_response_at = least(i.first_response_at, ${at}),
          status_changed_at = case when i.status <> ${status} then now() else i.status_changed_at end,
          status = ${status},
          updated_at = now()
        where i.id = ${id} ${scopeFilter(tx, scope)}
      `;
    });
  },

  async clientsForAgent(agentUserId): Promise<readonly ClientSummary[]> {
    return withUser(agentUserId, async (tx) => {
      const rows = await tx<{
        customer_id: string;
        customer_name: string | null;
        customer_email: string | null;
        open_inquiries: number;
        total_inquiries: number;
        upcoming_viewings: number;
        last_activity_at: Date;
        latest_conversation_id: string | null;
        latest_listing_title: string | null;
        latest_status: string;
      }[]>`
        select
          i.customer_id,
          u.display_name as customer_name,
          u.email as customer_email,
          count(*) filter (where i.status not in ('CLOSED', 'LOST'))::int as open_inquiries,
          count(*)::int as total_inquiries,
          (select count(*)::int from viewings v
            where v.customer_id = i.customer_id
              and v.agent_id = app_private.current_app_agent()
              and v.status in ('REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED')
              and v.scheduled_at > now()) as upcoming_viewings,
          max(greatest(i.updated_at, coalesce(c.last_message_at, i.updated_at))) as last_activity_at,
          (array_agg(i.conversation_id order by i.updated_at desc))[1] as latest_conversation_id,
          (array_agg(l.title order by i.updated_at desc))[1] as latest_listing_title,
          (array_agg(i.status order by i.updated_at desc))[1] as latest_status
        from inquiries i
        left join listings l on l.id = i.listing_id
        left join user_profiles u on u.id = i.customer_id
        left join conversations c on c.id = i.conversation_id
        where i.agent_id = app_private.current_app_agent()
        group by i.customer_id, u.display_name, u.email
        order by last_activity_at desc
        limit 200
      `;
      return rows.map((row) => ({
        customerId: row.customer_id,
        customerName: row.customer_name?.trim() || row.customer_email?.split('@')[0] || 'Customer',
        openInquiries: row.open_inquiries,
        totalInquiries: row.total_inquiries,
        upcomingViewings: row.upcoming_viewings,
        lastActivityAt: row.last_activity_at,
        latestConversationId: row.latest_conversation_id,
        latestListingTitle: row.latest_listing_title ?? 'Listing no longer available',
        latestStatus: row.latest_status as InquiryStatus,
      }));
    });
  },
});
