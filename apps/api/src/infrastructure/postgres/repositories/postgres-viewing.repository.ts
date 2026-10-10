import type postgres from 'postgres';
import type { PartyScope } from '@/application/ports/repositories/party-scope.port.ts';
import type {
  NewViewingRequest,
  ViewingChange,
  ViewingRange,
  ViewingRepository,
} from '@/application/ports/repositories/viewing-repository.port.ts';
import type { LeadAssignment, PreferredTimeWindow } from '@/domain/assignment/lead-assignment.ts';
import type { Viewing, ViewingActor, ViewingStatus } from '@/domain/viewings/viewing.ts';
import { InvalidViewingTransitionError, ViewingNotFoundError, ViewingSlotTakenError } from '@/domain/viewings/viewing.ts';
import { withScope, withUser } from '@/infrastructure/postgres/db.ts';
import {
  insertLeadAssignment,
  loadLeadAssignment,
} from '@/infrastructure/postgres/repositories/postgres-lead-assignment.repository.ts';

interface ViewingRow {
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
  inquiry_id: string | null;
  conversation_id: string;
  lead_assignment_id: string | null;
  representation_id: string | null;
  preferred_date: string | null;
  preferred_window: string | null;
  time_zone: string;
  scheduled_at: Date | null;
  duration_minutes: number;
  status: string;
  customer_note: string;
  partner_note: string;
  agent_change_notice: string | null;
  created_at: Date;
  updated_at: Date;
  confirmed_at: Date | null;
  declined_at: Date | null;
  cancelled_at: Date | null;
  cancelled_by_role: string | null;
  assigned_at: Date | null;
  response_due_at: Date | null;
}

const ACTIVE = ['MATCHING', 'REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'] as const;

const SELECT = (tx: postgres.TransactionSql) => tx`
  select
    v.id, v.organization_id, o.trading_name as organization_name,
    v.listing_id, l.title as listing_title,
    (select m.storage_url from media_assets m
      where m.listing_id = v.listing_id and m.kind = 'PHOTO' and m.representation_id is null
      order by m.position limit 1) as listing_photo,
    p.area_label, p.city_label,
    v.customer_id, u.display_name as customer_name, u.email as customer_email,
    v.agent_id, a.display_name as agent_name,
    v.inquiry_id, v.conversation_id, v.lead_assignment_id, v.representation_id,
    to_char(v.preferred_date, 'YYYY-MM-DD') as preferred_date, v.preferred_window, v.time_zone,
    v.scheduled_at, v.duration_minutes, v.status,
    v.customer_note, v.partner_note, v.agent_change_notice, v.created_at, v.updated_at,
    v.confirmed_at, v.declined_at, v.cancelled_at, v.cancelled_by_role,
    la.assigned_at, la.response_due_at
  from viewings v
  join organizations o on o.id = v.organization_id
  left join listings l on l.id = v.listing_id
  left join rentable_resources rr on rr.id = l.resource_id
  left join properties p on p.id = rr.property_id
  left join user_profiles u on u.id = v.customer_id
  left join agent_profiles a on a.id = v.agent_id
  left join lead_assignments la on la.id = v.lead_assignment_id and la.agent_id = v.agent_id
`;

const EFFECTIVE_START = (tx: postgres.TransactionSql) =>
  tx`coalesce(v.scheduled_at, (v.preferred_date::timestamp at time zone v.time_zone))`;

const toViewing = (row: ViewingRow): Viewing => ({
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
  inquiryId: row.inquiry_id,
  conversationId: row.conversation_id,
  leadAssignmentId: row.lead_assignment_id,
  representationId: row.representation_id,
  preferredDate: row.preferred_date,
  preferredWindow: row.preferred_window as PreferredTimeWindow | null,
  timeZone: row.time_zone,
  scheduledAt: row.scheduled_at,
  durationMinutes: row.duration_minutes,
  status: row.status as ViewingStatus,
  customerNote: row.customer_note,
  partnerNote: row.partner_note,
  agentChangeNotice: row.agent_change_notice,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  confirmedAt: row.confirmed_at,
  declinedAt: row.declined_at,
  cancelledAt: row.cancelled_at,
  cancelledByRole: row.cancelled_by_role as ViewingActor | null,
  assignedAt: row.assigned_at,
  responseDueAt: row.response_due_at,
});

function inScope<T>(scope: PartyScope, work: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  if ('customerId' in scope) return withUser(scope.customerId, work);
  if ('agentUserId' in scope) return withUser(scope.agentUserId, work);
  return withScope(scope.organizationId, work);
}

const scopeFilter = (tx: postgres.TransactionSql, scope: PartyScope) => {
  if ('customerId' in scope) return tx`and v.customer_id = ${scope.customerId}`;
  if ('agentUserId' in scope) return tx`and v.agent_id = app_private.current_app_agent()`;
  return tx`and v.organization_id = ${scope.organizationId}`;
};

const rangeFilter = (tx: postgres.TransactionSql, range: ViewingRange) => tx`
  ${range.from ? tx`and ${EFFECTIVE_START(tx)} >= ${range.from}` : tx``}
  ${range.to ? tx`and ${EFFECTIVE_START(tx)} < ${range.to}` : tx``}
`;

const UNIQUE_VIOLATION = '23505';

const translateConflict = (error: unknown): never => {
  const failure = error as { code?: string; constraint_name?: string; constraint?: string };
  if (failure.code === UNIQUE_VIOLATION && (failure.constraint_name ?? failure.constraint) === 'viewings_slot_taken') {
    throw new ViewingSlotTakenError('Another viewing of this property is already set for that time. Choose another time.');
  }
  throw error;
};

async function loadOne(tx: postgres.TransactionSql, id: string): Promise<Viewing | null> {
  const [row] = await tx<ViewingRow[]>`${SELECT(tx)} where v.id = ${id}`;
  return row ? toViewing(row) : null;
}

export const postgresViewingRepository = (): ViewingRepository => ({
  async findByClientRef(customerId, clientRef) {
    return withUser(customerId, async (tx) => {
      const [row] = await tx<ViewingRow[]>`
        ${SELECT(tx)} where v.customer_id = ${customerId} and v.client_ref = ${clientRef}
      `;
      return row ? toViewing(row) : null;
    });
  },

  async activeForCustomerListing(customerId, listingId) {
    return withUser(customerId, async (tx) => {
      const [row] = await tx<ViewingRow[]>`
        ${SELECT(tx)}
        where v.customer_id = ${customerId} and v.listing_id = ${listingId} and v.status in ${tx(ACTIVE)}
      `;
      return row ? toViewing(row) : null;
    });
  },

  async submitRequest(input: NewViewingRequest) {
    return withUser(input.customerId, async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtext(${`viewing:${input.listingId}:${input.customerId}`}))`;

      const [byRef] = await tx<{ id: string; lead_assignment_id: string | null }[]>`
        select id, lead_assignment_id from viewings where customer_id = ${input.customerId} and client_ref = ${input.clientRef}
      `;
      if (byRef) {
        return {
          viewing: (await loadOne(tx, byRef.id))!,
          assignment: await loadLeadAssignment(tx, byRef.lead_assignment_id),
          created: false,
        };
      }

      const [active] = await tx<{ id: string; lead_assignment_id: string | null }[]>`
        select id, lead_assignment_id from viewings
         where customer_id = ${input.customerId} and listing_id = ${input.listingId} and status in ${tx(ACTIVE)}
      `;
      if (active) {
        return {
          viewing: (await loadOne(tx, active.id))!,
          assignment: await loadLeadAssignment(tx, active.lead_assignment_id),
          created: false,
        };
      }

      let assignment: LeadAssignment | null = null;
      if (input.assignment.kind === 'NEW') {
        assignment = await insertLeadAssignment(tx, input.assignment.assignment);
      } else if (input.assignment.kind === 'EXISTING') {
        assignment = await loadLeadAssignment(tx, input.assignment.assignmentId);
      }
      const agentId = assignment?.agentId ?? null;

      const [conversation] = await tx<{ id: string }[]>`
        insert into conversations (organization_id, listing_id, customer_id, agent_id)
        values (${input.organizationId}, ${input.listingId}, ${input.customerId}, ${agentId})
        on conflict (listing_id, customer_id) do update
          set agent_id = coalesce(excluded.agent_id, conversations.agent_id)
        returning id
      `;

      const [inserted] = await tx<{ id: string }[]>`
        insert into viewings (
          organization_id, listing_id, customer_id, agent_id, inquiry_id, conversation_id,
          lead_assignment_id, representation_id, preferred_date, preferred_window, time_zone,
          scheduled_at, duration_minutes, status, customer_note, client_ref
        ) values (
          ${input.organizationId}, ${input.listingId}, ${input.customerId}, ${agentId}, ${input.inquiryId},
          ${conversation!.id}, ${assignment?.id ?? null}, ${assignment?.representationId ?? null},
          ${input.preferredDate}, ${input.preferredWindow}, ${input.timeZone},
          null, ${input.durationMinutes}, ${agentId ? 'REQUESTED' : 'MATCHING'}, ${input.customerNote}, ${input.clientRef}
        )
        returning id
      `;

      if (agentId) {
        await tx`
          update inquiries set agent_id = ${agentId}, updated_at = now()
           where listing_id = ${input.listingId} and customer_id = ${input.customerId}
             and status not in ('CLOSED', 'LOST')
        `;
      }

      const [message] = await tx<{ created_at: Date }[]>`
        insert into messages (organization_id, conversation_id, sender_id, sender_role, body, client_id)
        values (${input.organizationId}, ${conversation!.id}, ${input.customerId}, 'CUSTOMER',
                ${input.requestMessage}, ${input.clientRef})
        on conflict (conversation_id, client_id) do nothing
        returning created_at
      `;
      if (message) {
        await tx`
          update conversations
             set last_message_at = ${message.created_at},
                 last_message_preview = ${input.requestPreview},
                 last_sender_role = 'CUSTOMER',
                 customer_last_read_at = ${message.created_at}
           where id = ${conversation!.id}
        `;
      }
      return { viewing: (await loadOne(tx, inserted!.id))!, assignment, created: true };
    });
  },

  async findForCustomer(customerId, id) {
    return withUser(customerId, async (tx) => {
      const [row] = await tx<ViewingRow[]>`${SELECT(tx)} where v.id = ${id} and v.customer_id = ${customerId}`;
      return row ? toViewing(row) : null;
    });
  },

  async listForCustomer(customerId) {
    return withUser(customerId, async (tx) => {
      const rows = await tx<ViewingRow[]>`
        ${SELECT(tx)} where v.customer_id = ${customerId} order by v.created_at desc limit 100
      `;
      return rows.map(toViewing);
    });
  },

  async findForOrganization(organizationId, id) {
    return withScope(organizationId, async (tx) => {
      const [row] = await tx<ViewingRow[]>`
        ${SELECT(tx)} where v.id = ${id} and v.organization_id = ${organizationId}
      `;
      return row ? toViewing(row) : null;
    });
  },

  async activeForAssignment(organizationId, assignmentId) {
    return withScope(organizationId, async (tx) => {
      const [row] = await tx<ViewingRow[]>`
        ${SELECT(tx)}
        where v.organization_id = ${organizationId} and v.lead_assignment_id = ${assignmentId}
          and v.status in ${tx(ACTIVE)}
        order by v.created_at desc
        limit 1
      `;
      return row ? toViewing(row) : null;
    });
  },

  async listForOrganization(organizationId, range) {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<ViewingRow[]>`
        ${SELECT(tx)}
        where v.organization_id = ${organizationId} ${rangeFilter(tx, range)}
        order by ${EFFECTIVE_START(tx)} asc
        limit 300
      `;
      return rows.map(toViewing);
    });
  },

  async findForAgent(agentUserId, id) {
    return withUser(agentUserId, async (tx) => {
      const [row] = await tx<ViewingRow[]>`
        ${SELECT(tx)} where v.id = ${id} and v.agent_id = app_private.current_app_agent()
      `;
      return row ? toViewing(row) : null;
    });
  },

  async listForAgent(agentUserId, range) {
    return withUser(agentUserId, async (tx) => {
      const rows = await tx<ViewingRow[]>`
        ${SELECT(tx)}
        where v.agent_id = app_private.current_app_agent() ${rangeFilter(tx, range)}
        order by ${EFFECTIVE_START(tx)} asc
        limit 300
      `;
      return rows.map(toViewing);
    });
  },

  async transition(scope, id, change: ViewingChange) {
    try {
      return await inScope(scope, async (tx) => {
        const updated = await tx<{ id: string }[]>`
          update viewings v set
            status = ${change.status},
            scheduled_at = ${change.scheduledAt === undefined ? tx`v.scheduled_at` : change.scheduledAt},
            preferred_date = ${change.preferredDate ?? tx`v.preferred_date`},
            preferred_window = ${change.preferredWindow ?? tx`v.preferred_window`},
            partner_note = ${change.partnerNote ?? tx`v.partner_note`},
            customer_note = ${change.customerNote ?? tx`v.customer_note`},
            confirmed_at = case when ${change.status} = 'CONFIRMED' then ${change.at}::timestamptz
                                when ${change.status} in ('REQUESTED', 'MATCHING', 'RESCHEDULE_REQUESTED') then null
                                else v.confirmed_at end,
            completed_at = case when ${change.status} = 'COMPLETED' then ${change.at}::timestamptz else v.completed_at end,
            cancelled_at = case when ${change.status} = 'CANCELLED' then ${change.at}::timestamptz else null end,
            cancelled_by_role = case when ${change.status} = 'CANCELLED' then ${change.cancelledByRole ?? null} else null end,
            declined_at = case when ${change.status} = 'DECLINED' then ${change.at}::timestamptz else v.declined_at end,
            agent_change_notice = case when ${change.status} = 'CANCELLED' then null else v.agent_change_notice end,
            updated_at = now()
          where v.id = ${id} and v.status = ${change.from} ${scopeFilter(tx, scope)}
          returning v.id
        `;
        if (updated.length === 0) {
          const [exists] = await tx<{ id: string }[]>`select v.id from viewings v where v.id = ${id} ${scopeFilter(tx, scope)}`;
          if (exists) throw new InvalidViewingTransitionError('This viewing was just updated. Refresh and try again.');
          throw new ViewingNotFoundError('Viewing not found');
        }
        return (await loadOne(tx, id))!;
      });
    } catch (error) {
      return translateConflict(error);
    }
  },
});
