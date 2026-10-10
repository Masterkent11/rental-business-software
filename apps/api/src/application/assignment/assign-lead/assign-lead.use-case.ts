import type { LeadAssignmentRepository } from '@/application/ports/repositories/lead-assignment-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { AssignableListing, LeadAssignmentSettings } from '@/application/assignment/assignment.types.ts';
import type { reassignLead } from '@/application/assignment/reassign-lead/reassign-lead.use-case.ts';
import {
  newAssignmentFrom,
  type resolveLeadAssignment,
} from '@/application/assignment/resolve-lead-assignment/resolve-lead-assignment.use-case.ts';
import type { LeadAssignment } from '@/domain/assignment/lead-assignment.ts';

export const assignLead =
  (deps: {
    readonly assignments: LeadAssignmentRepository;
    readonly resolve: ReturnType<typeof resolveLeadAssignment>;
    readonly reassign: ReturnType<typeof reassignLead>;
    readonly clock: Clock;
    readonly settings: LeadAssignmentSettings;
  }) =>
  async (input: {
    readonly listing: AssignableListing;
    readonly customerId: string;
    readonly referralCode: string | null;
  }): Promise<LeadAssignment | null> => {
    const { decision, existing } = await deps.resolve({
      listing: input.listing,
      customerId: input.customerId,
      purpose: 'INQUIRY',
      schedule: null,
      referralCode: input.referralCode,
    });
    if (existing && decision.kind === 'ASSIGNED' && decision.continued) return existing;
    if (existing) {
      return deps.reassign({
        organizationId: input.listing.organizationId,
        assignment: existing,
        releaseReason: 'AGENT_UNAVAILABLE',
        listing: input.listing,
        schedule: null,
        viewingStatusWithoutAgent: 'MATCHING',
      });
    }
    if (decision.kind !== 'ASSIGNED') return null;
    return deps.assignments.create(
      newAssignmentFrom(decision, {
        listing: input.listing,
        customerId: input.customerId,
        purpose: 'INQUIRY',
        previousAssignmentId: null,
        settings: deps.settings,
        now: deps.clock.now(),
      }),
    );
  };
