import type { InquiryRepository } from '@/application/ports/repositories/inquiry-repository.port.ts';
import type { LeadAssignmentRepository } from '@/application/ports/repositories/lead-assignment-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { reassignLead } from '@/application/assignment/reassign-lead/reassign-lead.use-case.ts';
import { customerViewingNotice } from '@/application/viewings/viewing-notifications.rules.ts';
import {
  InvalidViewingSlotError,
  ViewingNotFoundError,
  assertConfirmableStart,
  nextViewingStatus,
  normaliseViewingNote,
  type Viewing,
} from '@/domain/viewings/viewing.ts';
import { statusAfterViewingConfirmed } from '@/domain/inquiries/inquiry.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { partnerRoleOf, partnerScopeFor } from '@/application/identity/partner-access.rules.ts';

export type PartnerViewingAction = 'CONFIRM' | 'REQUEST_RESCHEDULE' | 'DECLINE' | 'CANCEL' | 'COMPLETE';

const TITLES: Record<Exclude<PartnerViewingAction, 'DECLINE'>, string> = {
  CONFIRM: 'Your viewing is confirmed',
  REQUEST_RESCHEDULE: 'Your agent suggested another time',
  CANCEL: 'Your viewing was cancelled',
  COMPLETE: 'Thanks for viewing the property',
};

const ENGAGING_ACTIONS: readonly PartnerViewingAction[] = ['CONFIRM', 'REQUEST_RESCHEDULE', 'COMPLETE'];

export const partnerViewingAction =
  (deps: {
    readonly viewings: ViewingRepository;
    readonly inquiries: InquiryRepository;
    readonly assignments: LeadAssignmentRepository;
    readonly notifications: NotificationRepository;
    readonly reassign: ReturnType<typeof reassignLead>;
    readonly clock: Clock;
  }) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string | null;
    readonly viewingId: string;
    readonly action: PartnerViewingAction;
    readonly scheduledAt: Date | null;
    readonly note: string | null;
  }): Promise<Viewing> => {
    const scope = partnerScopeFor(input.principal, input.organizationId);
    const current =
      'organizationId' in scope
        ? await deps.viewings.findForOrganization(scope.organizationId, input.viewingId)
        : await deps.viewings.findForAgent(input.principal.userId, input.viewingId);
    if (!current) throw new ViewingNotFoundError('Viewing not found');
    const now = deps.clock.now();
    const role = partnerRoleOf(scope);
    const status = nextViewingStatus(current.status, input.action, role, {
      now,
      scheduledAt: current.scheduledAt,
      hasAgent: current.agentId !== null,
    });

    if (input.action === 'DECLINE') return declineViewing(deps, current);

    let scheduledAt: Date | null | undefined;
    if (input.action === 'CONFIRM') {
      if (!input.scheduledAt) throw new InvalidViewingSlotError('Choose the exact viewing time');
      assertConfirmableStart(input.scheduledAt, now);
      scheduledAt = input.scheduledAt;
    } else if (input.action === 'REQUEST_RESCHEDULE') {
      if (input.scheduledAt) assertConfirmableStart(input.scheduledAt, now);
      scheduledAt = input.scheduledAt;
    }

    const updated = await deps.viewings.transition(scope, input.viewingId, {
      from: current.status,
      status,
      at: now,
      ...(scheduledAt !== undefined ? { scheduledAt } : {}),
      ...(input.note !== null ? { partnerNote: normaliseViewingNote(input.note) } : {}),
      ...(input.action === 'CANCEL' ? { cancelledByRole: role } : {}),
    });

    if (role === 'AGENT' && updated.leadAssignmentId && ENGAGING_ACTIONS.includes(input.action)) {
      await deps.assignments.markAcceptedById(updated.organizationId, updated.leadAssignmentId, now);
    }

    if (input.action === 'CONFIRM' && updated.inquiryId) {
      const inquiry =
        'organizationId' in scope
          ? await deps.inquiries.findForOrganization(scope.organizationId, updated.inquiryId)
          : await deps.inquiries.findForAgent(input.principal.userId, updated.inquiryId);
      if (inquiry) {
        const next = statusAfterViewingConfirmed(inquiry.status);
        if (next !== inquiry.status) await deps.inquiries.setStatus(scope, inquiry.id, next, null);
      }
    }

    await deps.notifications.publish([customerViewingNotice(updated, TITLES[input.action])]);
    return updated;
  };

async function declineViewing(
  deps: Parameters<typeof partnerViewingAction>[0],
  current: Viewing,
): Promise<Viewing> {
  if (!current.leadAssignmentId) throw new ViewingNotFoundError('This request is not assigned to you');
  const assignment = await deps.assignments.findInOrganization(current.organizationId, current.leadAssignmentId);
  if (!assignment || assignment.agentId !== current.agentId) {
    throw new ViewingNotFoundError('This request is not assigned to you');
  }
  await deps.reassign({
    organizationId: current.organizationId,
    assignment,
    releaseReason: 'AGENT_DECLINED',
    viewingStatusWithoutAgent: 'MATCHING',
  });
  const updated = await deps.viewings.findForOrganization(current.organizationId, current.id);
  if (!updated) throw new ViewingNotFoundError('Viewing not found');
  return updated;
}
