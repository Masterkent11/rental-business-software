import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { LeadAssignmentRepository } from '@/application/ports/repositories/lead-assignment-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { LeadAssignmentSettings } from '@/application/assignment/assignment.types.ts';
import type { reassignLead } from '@/application/assignment/reassign-lead/reassign-lead.use-case.ts';
import { assignableListing } from '@/application/assignment/assignable-listing.rules.ts';
import {
  newAssignmentFrom,
  type resolveLeadAssignment,
} from '@/application/assignment/resolve-lead-assignment/resolve-lead-assignment.use-case.ts';
import { agentViewingNotice, customerViewingNotice } from '@/application/viewings/viewing-notifications.rules.ts';
import { windowBounds, type Viewing } from '@/domain/viewings/viewing.ts';

export interface LeadSweepReport {
  readonly accepted: number;
  readonly reassigned: number;
  readonly attached: number;
  readonly expired: number;
}

export const LEAD_SWEEP_BATCH_SIZE = 50;

export const sweepLeadAssignments =
  (deps: {
    readonly assignments: LeadAssignmentRepository;
    readonly viewings: ViewingRepository;
    readonly listings: ListingRepository;
    readonly agents: AgentRepository;
    readonly notifications: NotificationRepository;
    readonly resolve: ReturnType<typeof resolveLeadAssignment>;
    readonly reassign: ReturnType<typeof reassignLead>;
    readonly clock: Clock;
    readonly settings: LeadAssignmentSettings;
  }) =>
  async (): Promise<LeadSweepReport> => {
    const now = deps.clock.now();
    let accepted = 0;
    let reassigned = 0;
    let attached = 0;
    let expired = 0;

    for (const due of await deps.assignments.dueForResponse(now, LEAD_SWEEP_BATCH_SIZE)) {
      const assignment = await deps.assignments.findInOrganization(due.organizationId, due.id);
      if (!assignment || assignment.status !== 'ASSIGNED') continue;
      const engagement = await deps.assignments.engagementOf(due.organizationId, due.id);
      if (engagement.accepted || engagement.agentMessages > 0 || engagement.viewingConfirmed) {
        await deps.assignments.markAcceptedById(due.organizationId, due.id, now);
        accepted += 1;
        continue;
      }
      await deps.reassign({
        organizationId: due.organizationId,
        assignment,
        releaseReason: 'RESPONSE_TIMEOUT',
        viewingStatusWithoutAgent: 'MATCHING',
      });
      reassigned += 1;
    }

    for (const pending of await deps.assignments.matchingViewings(LEAD_SWEEP_BATCH_SIZE)) {
      const viewing = await deps.viewings.findForOrganization(pending.organizationId, pending.viewingId);
      if (!viewing || viewing.status !== 'MATCHING') continue;
      if (windowHasPassed(viewing, now)) {
        const declined = await deps.viewings.transition({ organizationId: viewing.organizationId }, viewing.id, {
          from: 'MATCHING',
          status: 'DECLINED',
          at: now,
        });
        await deps.notifications.publish([
          customerViewingNotice(
            declined,
            'No specialist was available for your viewing',
            'Please choose another date or time window and we will match you again.',
          ),
        ]);
        expired += 1;
        continue;
      }
      if (await attachSpecialist(deps, viewing, now)) attached += 1;
    }

    return { accepted, reassigned, attached, expired };
  };

const windowHasPassed = (viewing: Viewing, now: Date): boolean =>
  !viewing.preferredDate || !viewing.preferredWindow
    ? false
    : windowBounds(viewing.preferredDate, viewing.preferredWindow).to.getTime() <= now.getTime();

async function attachSpecialist(
  deps: Parameters<typeof sweepLeadAssignments>[0],
  viewing: Viewing,
  now: Date,
): Promise<boolean> {
  const listing = await deps.listings.findById(viewing.organizationId, viewing.listingId);
  if (!listing || !viewing.preferredDate || !viewing.preferredWindow) return false;
  const assignable = assignableListing(listing);
  const history = await deps.assignments.historyFor(viewing.organizationId, viewing.listingId, viewing.customerId);
  const { decision } = await deps.resolve({
    listing: assignable,
    customerId: viewing.customerId,
    purpose: 'VIEWING',
    schedule: { date: viewing.preferredDate, window: viewing.preferredWindow },
    referralCode: null,
    excludedAgentIds: history.map((entry) => entry.agentId),
    existing: null,
  });
  if (decision.kind !== 'ASSIGNED') return false;
  const assignment = await deps.assignments.attachToViewing(
    viewing.organizationId,
    viewing.id,
    newAssignmentFrom(decision, {
      listing: assignable,
      customerId: viewing.customerId,
      purpose: 'VIEWING',
      previousAssignmentId: history.at(-1)?.id ?? null,
      settings: deps.settings,
      now,
    }),
  );
  if (!assignment) return false;
  const agent = await deps.agents.findAssigned(viewing.customerId, assignment.agentId);
  if (agent) {
    await deps.notifications.publish([
      agentViewingNotice(viewing, agent.userId, 'VIEWING_REQUESTED', `New viewing request from ${viewing.customerName}`),
    ]);
  }
  return true;
}
