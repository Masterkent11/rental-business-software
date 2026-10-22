import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { CustomerViewingView } from '@/application/viewings/viewing.types.ts';
import { customerViewingView } from '@/application/viewings/customer-viewing-view.rules.ts';
import { agentViewingNotice, organizationViewingNotice } from '@/application/viewings/viewing-notifications.rules.ts';
import {
  InvalidViewingSlotError,
  ViewingNotFoundError,
  assertPreferredSchedule,
  nextViewingStatus,
  normaliseViewingNote,
} from '@/domain/viewings/viewing.ts';
import type { PreferredTimeWindow } from '@/domain/assignment/lead-assignment.ts';
import type { NewNotification } from '@/domain/notifications/notification.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export type CustomerViewingAction = 'CANCEL' | 'RESCHEDULE' | 'ACCEPT_SUGGESTION';

export const customerViewingAction =
  (deps: {
    readonly viewings: ViewingRepository;
    readonly agents: AgentRepository;
    readonly notifications: NotificationRepository;
    readonly clock: Clock;
  }) =>
  async (input: {
    readonly principal: Principal;
    readonly viewingId: string;
    readonly action: CustomerViewingAction;
    readonly preferredDate: string | null;
    readonly preferredWindow: PreferredTimeWindow | null;
    readonly note: string | null;
  }): Promise<CustomerViewingView> => {
    const customerId = input.principal.userId;
    const current = await deps.viewings.findForCustomer(customerId, input.viewingId);
    if (!current) throw new ViewingNotFoundError('Viewing not found');
    const now = deps.clock.now();
    const status = nextViewingStatus(current.status, input.action, 'CUSTOMER', {
      now,
      scheduledAt: current.scheduledAt,
      hasAgent: current.agentId !== null,
    });

    let reschedule: { readonly preferredDate: string; readonly preferredWindow: PreferredTimeWindow } | null = null;
    if (input.action === 'RESCHEDULE') {
      if (!input.preferredDate || !input.preferredWindow) throw new InvalidViewingSlotError('Choose a new date and time');
      assertPreferredSchedule(input.preferredDate, input.preferredWindow, now);
      reschedule = { preferredDate: input.preferredDate, preferredWindow: input.preferredWindow };
    }

    const updated = await deps.viewings.transition({ customerId }, input.viewingId, {
      from: current.status,
      status,
      at: now,
      ...(reschedule ? { ...reschedule, scheduledAt: null } : {}),
      ...(input.note !== null && input.action === 'RESCHEDULE' ? { customerNote: normaliseViewingNote(input.note) } : {}),
      ...(input.action === 'CANCEL' ? { cancelledByRole: 'CUSTOMER' as const } : {}),
    });

    const title = {
      CANCEL: `${updated.customerName} cancelled a viewing`,
      RESCHEDULE: `${updated.customerName} picked a new viewing time`,
      ACCEPT_SUGGESTION: `${updated.customerName} accepted the suggested viewing time`,
    }[input.action];
    const outgoing: NewNotification[] = [{ ...organizationViewingNotice(updated, title), kind: 'VIEWING_UPDATED' }];
    if (updated.agentId) {
      const agent = await deps.agents.findAssigned(customerId, updated.agentId);
      if (agent) outgoing.push(agentViewingNotice(updated, agent.userId, 'VIEWING_UPDATED', title));
    }
    await deps.notifications.publish(outgoing);
    return customerViewingView(updated, deps.agents);
  };
