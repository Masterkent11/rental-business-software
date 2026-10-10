import type postgres from 'postgres';
import type {
  CandidateQuery,
  LeadAssignmentRepository,
  NewLeadAssignment,
  Reassignment,
} from '@/application/ports/repositories/lead-assignment-repository.port.ts';
import type {
  AssignmentCandidate,
  AssignmentReason,
  LeadAssignment,
  LeadAssignmentStatus,
  LeadPurpose,
  ReleaseReason,
  ScoreBreakdown,
} from '@/domain/assignment/lead-assignment.ts';
import { RepresentationForbiddenError, type RepresentationKind } from '@/domain/agents/agent.ts';
import { withScope, withUser } from '@/infrastructure/postgres/db.ts';

interface AssignmentRow {
  id: string;
  organization_id: string;
  listing_id: string;
  customer_id: string;
  representation_id: string | null;
  agent_id: string;
  purpose: string;
  status: string;
  assignment_reason: string;
  score: string | null;
  score_breakdown: Record<string, number> | null;
  candidates_considered: number;
  previous_assignment_id: string | null;
  release_reason: string | null;
  response_due_at: Date | null;
  assigned_at: Date;
  accepted_at: Date | null;
  released_at: Date | null;
}

interface CandidateRow {
  representation_id: string;
  agent_id: string;
  organization_id: string;
  representation_type: string;
  is_primary: boolean;
  representation_accepts_leads: boolean;
  valid_from: Date | null;
  valid_until: Date | null;
  initiated_by: string;
  agent_display_name: string;
  agent_verification_state: string;
  agent_accepts_leads: boolean;
  agent_lead_capacity: number;
  agent_deactivated: boolean;
  organization_state: string;
  agent_specialties: string[] | null;
  agent_areas_served: string[] | null;
  active_leads: string;
  recent_assignments: string;
  last_assigned_at: Date | null;
  accepted_assignments: string;
  missed_assignments: string;
  schedule_conflicts: string;
  listing_activity: string;
}

const ACTIVE = ['ASSIGNED', 'ACCEPTED'] as const;
const ACTIVE_VIEWINGS = ['MATCHING', 'REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'] as const;

const SELECT = (tx: postgres.TransactionSql) => tx`
  select la.id, la.organization_id, la.listing_id, la.customer_id, la.representation_id, la.agent_id, la.purpose,
         la.status, la.assignment_reason, la.score, la.score_breakdown, la.candidates_considered,
         la.previous_assignment_id, la.release_reason, la.response_due_at, la.assigned_at, la.accepted_at, la.released_at
    from lead_assignments la
`;

const toBreakdown = (raw: Record<string, number> | null): ScoreBreakdown | null =>
  raw && Object.keys(raw).length > 0
    ? {
        availability: Number(raw.availability ?? 0),
        responseReliability: Number(raw.responseReliability ?? 0),
        workload: Number(raw.workload ?? 0),
        propertyFamiliarity: Number(raw.propertyFamiliarity ?? 0),
        specialization: Number(raw.specialization ?? 0),
        fairness: Number(raw.fairness ?? 0),
      }
    : null;

const toAssignment = (row: AssignmentRow): LeadAssignment => ({
  id: row.id,
  organizationId: row.organization_id,
  listingId: row.listing_id,
  customerId: row.customer_id,
  representationId: row.representation_id,
  agentId: row.agent_id,
  purpose: row.purpose as LeadPurpose,
  status: row.status as LeadAssignmentStatus,
  reason: row.assignment_reason as AssignmentReason,
  score: row.score === null ? null : Number(row.score),
  breakdown: toBreakdown(row.score_breakdown),
  candidatesConsidered: row.candidates_considered,
  previousAssignmentId: row.previous_assignment_id,
  releaseReason: row.release_reason as ReleaseReason | null,
  responseDueAt: row.response_due_at,
  assignedAt: row.assigned_at,
  acceptedAt: row.accepted_at,
  releasedAt: row.released_at,
});

const toCandidate = (row: CandidateRow): AssignmentCandidate => ({
  representationId: row.representation_id,
  agentId: row.agent_id,
  organizationId: row.organization_id,
  representationType: row.representation_type as RepresentationKind,
  isPrimary: row.is_primary,
  representationAcceptsLeads: row.representation_accepts_leads,
  validFrom: row.valid_from,
  validUntil: row.valid_until,
  initiatedByAgent: row.initiated_by === 'AGENT',
  agentName: row.agent_display_name,
  verificationState: row.agent_verification_state,
  agentAcceptsLeads: row.agent_accepts_leads,
  leadCapacity: row.agent_lead_capacity,
  agentDeactivated: row.agent_deactivated,
  organizationState: row.organization_state,
  specialties: row.agent_specialties ?? [],
  areasServed: row.agent_areas_served ?? [],
  activeLeads: Number(row.active_leads),
  recentAssignments: Number(row.recent_assignments),
  lastAssignedAt: row.last_assigned_at,
  acceptedAssignments: Number(row.accepted_assignments),
  missedAssignments: Number(row.missed_assignments),
  scheduleConflicts: Number(row.schedule_conflicts),
  listingActivity: Number(row.listing_activity),
});

export async function loadLeadAssignment(tx: postgres.TransactionSql, id: string | null): Promise<LeadAssignment | null> {
  if (!id) return null;
  const [row] = await tx<AssignmentRow[]>`${SELECT(tx)} where la.id = ${id}`;
  return row ? toAssignment(row) : null;
}

export async function insertLeadAssignment(
  tx: postgres.TransactionSql,
  next: NewLeadAssignment,
): Promise<LeadAssignment> {
  const [inserted] = await tx<AssignmentRow[]>`
    insert into lead_assignments (
      organization_id, listing_id, customer_id, representation_id, agent_id, purpose, status,
      assignment_reason, score, score_breakdown, candidates_considered, previous_assignment_id,
      response_due_at, assigned_at
    ) values (
      ${next.organizationId}, ${next.listingId}, ${next.customerId}, ${next.representationId}, ${next.agentId},
      ${next.purpose}, 'ASSIGNED', ${next.reason}, ${next.score},
      ${tx.json((next.breakdown ?? {}) as unknown as postgres.JSONValue)}, ${next.considered},
      ${next.previousAssignmentId}, ${next.responseDueAt}, ${next.assignedAt}
    )
    on conflict (listing_id, customer_id) where status in ('ASSIGNED', 'ACCEPTED') do nothing
    returning *
  `;
  if (inserted) return toAssignment(inserted);
  const [existing] = await tx<AssignmentRow[]>`
    ${SELECT(tx)}
    where la.listing_id = ${next.listingId} and la.customer_id = ${next.customerId}
      and la.status in ${tx(ACTIVE)}
  `;
  return toAssignment(existing!);
}

async function syncAgentForLead(
  tx: postgres.TransactionSql,
  listingId: string,
  customerId: string,
  agentId: string | null,
): Promise<void> {
  await tx`
    update conversations set agent_id = ${agentId}
     where listing_id = ${listingId} and customer_id = ${customerId}
  `;
  await tx`
    update inquiries set agent_id = ${agentId}, updated_at = now()
     where listing_id = ${listingId} and customer_id = ${customerId} and status not in ('CLOSED', 'LOST')
  `;
}

export const postgresLeadAssignmentRepository = (): LeadAssignmentRepository => ({
  async activeFor(customerId, listingId) {
    return withUser(customerId, async (tx) => {
      const [row] = await tx<AssignmentRow[]>`
        ${SELECT(tx)}
        where la.listing_id = ${listingId} and la.customer_id = ${customerId} and la.status in ${tx(ACTIVE)}
      `;
      return row ? toAssignment(row) : null;
    });
  },

  async candidates(query: CandidateQuery) {
    return withScope(null, async (tx) => {
      const rows = await tx<CandidateRow[]>`
        select * from app_private.lead_assignment_candidates(
          ${query.listingId}, ${query.customerId},
          ${query.window?.from ?? null}::timestamptz, ${query.window?.to ?? null}::timestamptz,
          ${query.window?.day ?? null}::date, ${query.window?.name ?? null}::text,
          ${query.fairnessSince}, ${query.reliabilitySince}
        )
      `;
      return rows.map(toCandidate);
    });
  },

  async referralAgentFor(customerId, listingId) {
    return withUser(customerId, async (tx) => {
      const [row] = await tx<{ agent_id: string }[]>`
        select agent_id from lead_referrals where listing_id = ${listingId} and customer_id = ${customerId}
      `;
      return row?.agent_id ?? null;
    });
  },

  async attributeReferral(customerId, listingId, code) {
    return withUser(customerId, async (tx) => {
      const [resolved] = await tx<{ agent_id: string | null }[]>`
        select app_private.resolve_referral_code(${code}, ${listingId}) as agent_id
      `;
      if (!resolved?.agent_id) return null;
      await tx`
        insert into lead_referrals (listing_id, customer_id, agent_id, code)
        values (${listingId}, ${customerId}, ${resolved.agent_id}, ${code.toUpperCase()})
        on conflict (listing_id, customer_id) do nothing
      `;
      const [row] = await tx<{ agent_id: string }[]>`
        select agent_id from lead_referrals where listing_id = ${listingId} and customer_id = ${customerId}
      `;
      return row?.agent_id ?? null;
    });
  },

  async issueReferralCode(agentUserId, listingId, code) {
    return withUser(agentUserId, async (tx) => {
      const [allowed] = await tx<{ ok: boolean }[]>`select app_private.agent_represents_listing(${listingId}) as ok`;
      if (!allowed?.ok) throw new RepresentationForbiddenError('You do not represent this listing');
      const [current] = await tx<{ code: string }[]>`
        select code from agent_referral_codes
         where agent_id = app_private.current_app_agent() and listing_id = ${listingId} and revoked_at is null
      `;
      if (current) return current.code;
      const [created] = await tx<{ code: string }[]>`
        insert into agent_referral_codes (code, agent_id, listing_id)
        values (${code}, app_private.current_app_agent(), ${listingId})
        returning code
      `;
      return created!.code;
    });
  },

  async findInOrganization(organizationId, id) {
    return withScope(organizationId, async (tx) => {
      const [row] = await tx<AssignmentRow[]>`${SELECT(tx)} where la.id = ${id} and la.organization_id = ${organizationId}`;
      return row ? toAssignment(row) : null;
    });
  },

  async findForAgent(agentUserId, id) {
    return withUser(agentUserId, async (tx) => {
      const [row] = await tx<AssignmentRow[]>`
        ${SELECT(tx)} where la.id = ${id} and la.agent_id = app_private.current_app_agent()
      `;
      return row ? toAssignment(row) : null;
    });
  },

  async create(next) {
    return withScope(next.organizationId, async (tx) => {
      const assignment = await insertLeadAssignment(tx, next);
      await syncAgentForLead(tx, next.listingId, next.customerId, assignment.agentId);
      return assignment;
    });
  },

  async historyFor(organizationId, listingId, customerId) {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<AssignmentRow[]>`
        ${SELECT(tx)}
        where la.organization_id = ${organizationId} and la.listing_id = ${listingId} and la.customer_id = ${customerId}
        order by la.assigned_at, la.created_at
      `;
      return rows.map(toAssignment);
    });
  },

  async engagementOf(organizationId, assignmentId) {
    return withScope(organizationId, async (tx) => {
      const [row] = await tx<{ accepted: boolean; agent_messages: string; viewing_confirmed: boolean }[]>`
        select
          (la.accepted_at is not null) as accepted,
          (select count(*) from messages m
             join conversations c on c.id = m.conversation_id
             join agent_profiles a on a.id = la.agent_id
            where c.listing_id = la.listing_id and c.customer_id = la.customer_id
              and m.sender_role = 'AGENT' and m.sender_id = a.user_id and m.created_at >= la.assigned_at) as agent_messages,
          exists (select 1 from viewings v where v.lead_assignment_id = la.id and v.confirmed_at is not null) as viewing_confirmed
        from lead_assignments la
        where la.id = ${assignmentId} and la.organization_id = ${organizationId}
      `;
      return {
        accepted: row?.accepted ?? false,
        agentMessages: Number(row?.agent_messages ?? 0),
        viewingConfirmed: row?.viewing_confirmed ?? false,
      };
    });
  },

  async markAccepted(agentUserId, listingId, customerId, at) {
    await withUser(agentUserId, async (tx) => {
      await tx`
        update lead_assignments set
          status = 'ACCEPTED',
          accepted_at = coalesce(accepted_at, ${at}),
          response_due_at = null,
          updated_at = now()
        where listing_id = ${listingId} and customer_id = ${customerId}
          and agent_id = app_private.current_app_agent() and status = 'ASSIGNED'
      `;
    });
  },

  async markAcceptedById(organizationId, id, at) {
    await withScope(organizationId, async (tx) => {
      await tx`
        update lead_assignments set
          status = 'ACCEPTED',
          accepted_at = coalesce(accepted_at, ${at}),
          response_due_at = null,
          updated_at = now()
        where id = ${id} and organization_id = ${organizationId} and status = 'ASSIGNED'
      `;
    });
  },

  async dueForResponse(at, limit) {
    return withScope(null, async (tx) => {
      const rows = await tx<{ id: string; organization_id: string }[]>`
        select id, organization_id from app_private.due_lead_assignments(${at}, ${limit})
      `;
      return rows.map((row) => ({ id: row.id, organizationId: row.organization_id }));
    });
  },

  async activeForRepresentation(organizationId, representationId) {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<AssignmentRow[]>`
        ${SELECT(tx)}
        where la.organization_id = ${organizationId} and la.representation_id = ${representationId}
          and la.status in ${tx(ACTIVE)}
      `;
      return rows.map(toAssignment);
    });
  },

  async matchingViewings(limit) {
    return withScope(null, async (tx) => {
      const rows = await tx<{ id: string; organization_id: string }[]>`
        select id, organization_id from app_private.matching_viewings(${limit})
      `;
      return rows.map((row) => ({ viewingId: row.id, organizationId: row.organization_id }));
    });
  },

  async attachToViewing(organizationId, viewingId, next) {
    return withScope(organizationId, async (tx) => {
      const assignment = await insertLeadAssignment(tx, next);
      const updated = await tx<{ id: string }[]>`
        update viewings set
          agent_id = ${assignment.agentId},
          representation_id = ${assignment.representationId},
          lead_assignment_id = ${assignment.id},
          status = 'REQUESTED',
          updated_at = now()
        where id = ${viewingId} and organization_id = ${organizationId} and status = 'MATCHING'
        returning id
      `;
      if (updated.length === 0) return null;
      await syncAgentForLead(tx, next.listingId, next.customerId, assignment.agentId);
      return assignment;
    });
  },

  async reassign(input: Reassignment) {
    return withScope(input.organizationId, async (tx) => {
      const released = await tx<{ id: string }[]>`
        update lead_assignments set
          status = ${input.next ? 'REASSIGNED' : 'RELEASED'},
          released_at = ${input.at},
          release_reason = ${input.releaseReason},
          response_due_at = null,
          updated_at = now()
        where id = ${input.current.id} and organization_id = ${input.organizationId} and status in ${tx(ACTIVE)}
        returning id
      `;
      if (released.length === 0) return null;
      const next = input.next ? await insertLeadAssignment(tx, input.next) : null;
      await tx`
        update viewings set
          agent_id = ${next?.agentId ?? null},
          representation_id = ${next?.representationId ?? null},
          lead_assignment_id = ${next?.id ?? tx`lead_assignment_id`},
          status = ${next ? 'REQUESTED' : input.viewingStatusWithoutAgent},
          confirmed_at = null,
          declined_at = ${next || input.viewingStatusWithoutAgent !== 'DECLINED' ? null : input.at},
          agent_change_notice = ${input.notice},
          updated_at = now()
        where lead_assignment_id = ${input.current.id} and status in ${tx(ACTIVE_VIEWINGS)}
      `;
      await syncAgentForLead(tx, input.current.listingId, input.current.customerId, next?.agentId ?? null);
      return next;
    });
  },
});
