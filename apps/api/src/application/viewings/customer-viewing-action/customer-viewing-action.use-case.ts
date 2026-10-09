import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import {
  InvalidViewingSlotError,
  ViewingNotFoundError,
  assertBookableSlot,
  formatViewingTime,
  nextViewingStatus,
  normaliseViewingNote,
  type Viewing,
} from '@/domain/viewings/viewing.ts';
import type { NewNotification } from '@/domain/notifications/notification.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export const customerViewingAction =
  (viewings: ViewingRepository, agents: AgentRepository, notifications: NotificationRepository, clock: Clock) =>
  async (input: {
    readonly principal: Principal;
    readonly viewingId: string;
    readonly action: 'CANCEL' | 'RESCHEDULE';
    readonly scheduledAt: Date | null;
    readonly note: string | null;
  }): Promise<Viewing> => {
    const current = await viewings.findForCustomer(input.principal.userId, input.viewingId);
    if (!current) throw new ViewingNotFoundError('Viewing not found');
    const now = clock.now();
    const status = nextViewingStatus(current.status, input.action, 'CUSTOMER', { now, scheduledAt: current.scheduledAt });

    let scheduledAt: Date | undefined;
    if (input.action === 'RESCHEDULE') {
      if (!input.scheduledAt) throw new InvalidViewingSlotError('Choose a new viewing time');
      assertBookableSlot(input.scheduledAt, now);
      scheduledAt = input.scheduledAt;
    }

    const updated = await viewings.transition({ customerId: input.principal.userId }, input.viewingId, {
      status,
      at: now,
      ...(scheduledAt ? { scheduledAt } : {}),
      ...(input.note !== null && input.action === 'RESCHEDULE' ? { customerNote: normaliseViewingNote(input.note) } : {}),
      ...(input.action === 'CANCEL' ? { cancelledByRole: 'CUSTOMER' as const } : {}),
    });

    const title =
      input.action === 'CANCEL'
        ? `${updated.customerName} cancelled a viewing`
        : `${updated.customerName} picked a new viewing time`;
    const body = `${updated.listingTitle} · ${formatViewingTime(updated.scheduledAt)}`;
    const outgoing: NewNotification[] = [
      { audience: { organizationId: updated.organizationId }, kind: 'VIEWING_UPDATED', title, body, link: `/viewings?v=${updated.id}` },
    ];
    if (updated.agentId) {
      const agent = await agents.findPublic(updated.agentId);
      if (agent) {
        outgoing.push({ audience: { userId: agent.userId }, kind: 'VIEWING_UPDATED', title, body, link: `/agent/viewings?v=${updated.id}` });
      }
    }
    await notifications.publish(outgoing);
    return updated;
  };
