import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { LeadAssignmentRepository } from '@/application/ports/repositories/lead-assignment-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { AssignableListing, LeadAssignmentSettings } from '@/application/assignment/assignment.types.ts';
import { assignableListing, firstNameOf } from '@/application/assignment/assignable-listing.rules.ts';
import {
  newAssignmentFrom,
  type resolveLeadAssignment,
} from '@/application/assignment/resolve-lead-assignment/resolve-lead-assignment.use-case.ts';
import type {
  AssignmentDecision,
  LeadAssignment,
  PreferredSchedule,
  ReleaseReason,
} from '@/domain/assignment/lead-assignment.ts';
import type { Viewing } from '@/domain/viewings/viewing.ts';
import { agentViewingNotice, customerViewingNotice } from '@/application/viewings/viewing-notifications.rules.ts';
import type { NewNotification } from '@/domain/notifications/notification.ts';

export interface ReassignLeadInput {
  readonly organizationId: string;
  readonly assignment: LeadAssignment;
  readonly releaseReason: ReleaseReason;
  readonly listing?: AssignableListing;
  readonly schedule?: PreferredSchedule | null;
  readonly viewingStatusWithoutAgent: 'MATCHING' | 'DECLINED';
}

const scheduleOf = (viewing: Viewing | null): PreferredSchedule | null =>
  viewing?.preferredDate && viewing.preferredWindow
    ? { date: viewing.preferredDate, window: viewing.preferredWindow }
    : null;

const changeNotice = (
  previousAgentName: string | null,
  decision: AssignmentDecision,
): string => {
  const previous = firstNameOf(previousAgentName);
  return decision.kind === 'ASSIGNED'
    ? `${previous} is unavailable for this viewing. We've connected you with ${firstNameOf(decision.candidate.agentName)} from the same property team.`
    : `${previous} is unavailable for this viewing. We're finding another specialist from the same property team.`;
};

export const reassignLead =
  (deps: {
    readonly assignments: LeadAssignmentRepository;
    readonly viewings: ViewingRepository;
    readonly listings: ListingRepository;
    readonly agents: AgentRepository;
    readonly notifications: NotificationRepository;
    readonly resolve: ReturnType<typeof resolveLeadAssignment>;
    readonly clock: Clock;
    readonly settings: LeadAssignmentSettings;
  }) =>
  async (input: ReassignLeadInput): Promise<LeadAssignment | null> => {
    const { assignment, organizationId } = input;
    const now = deps.clock.now();
    const [viewing, history, engagement, listing] = await Promise.all([
      deps.viewings.activeForAssignment(organizationId, assignment.id),
      deps.assignments.historyFor(organizationId, assignment.listingId, assignment.customerId),
      deps.assignments.engagementOf(organizationId, assignment.id),
      input.listing
        ? Promise.resolve(input.listing)
        : deps.listings.findById(organizationId, assignment.listingId).then((found) => (found ? assignableListing(found) : null)),
    ]);

    const excludedAgentIds = [...new Set([assignment.agentId, ...history.map((entry) => entry.agentId)])];
    const decision: AssignmentDecision = listing
      ? (
          await deps.resolve({
            listing,
            customerId: assignment.customerId,
            purpose: assignment.purpose,
            schedule: input.schedule !== undefined ? input.schedule : scheduleOf(viewing),
            referralCode: null,
            excludedAgentIds,
            existing: null,
          })
        ).decision
      : { kind: 'UNAVAILABLE', considered: 0 };

    const engaged = engagement.accepted || engagement.agentMessages > 0 || engagement.viewingConfirmed;
    const notice = engaged && viewing ? changeNotice(viewing.agentName, decision) : null;
    const next =
      decision.kind === 'ASSIGNED' && listing
        ? newAssignmentFrom(decision, {
            listing,
            customerId: assignment.customerId,
            purpose: assignment.purpose,
            previousAssignmentId: assignment.id,
            settings: deps.settings,
            now,
          })
        : null;

    const replaced = await deps.assignments.reassign({
      organizationId,
      current: assignment,
      releaseReason: input.releaseReason,
      next,
      viewingStatusWithoutAgent: input.viewingStatusWithoutAgent,
      notice,
      at: now,
    });

    if (viewing) {
      const outgoing: NewNotification[] = [];
      if (replaced) {
        const agent = await deps.agents.findAssigned(assignment.customerId, replaced.agentId);
        if (agent) {
          outgoing.push(
            agentViewingNotice(viewing, agent.userId, 'VIEWING_REQUESTED', `New viewing request from ${viewing.customerName}`),
          );
        }
      }
      if (notice) outgoing.push(customerViewingNotice(viewing, 'Your viewing specialist changed', notice));
      if (outgoing.length > 0) await deps.notifications.publish(outgoing);
    }
    return replaced;
  };
