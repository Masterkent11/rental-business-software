import type { InquiryRepository } from '@/application/ports/repositories/inquiry-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import {
  ViewingNotFoundError,
  formatViewingTime,
  nextViewingStatus,
  normaliseViewingNote,
  type Viewing,
} from '@/domain/viewings/viewing.ts';
import { statusAfterViewingConfirmed } from '@/domain/inquiries/inquiry.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { partnerRoleOf, partnerScopeFor } from '@/application/identity/partner-access.rules.ts';

export type PartnerViewingAction = 'CONFIRM' | 'REQUEST_RESCHEDULE' | 'CANCEL' | 'COMPLETE';

const TITLES: Record<PartnerViewingAction, string> = {
  CONFIRM: 'Your viewing is confirmed',
  REQUEST_RESCHEDULE: 'Please pick another viewing time',
  CANCEL: 'Your viewing was cancelled',
  COMPLETE: 'Thanks for viewing the property',
};

export const partnerViewingAction =
  (viewings: ViewingRepository, inquiries: InquiryRepository, notifications: NotificationRepository, clock: Clock) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string | null;
    readonly viewingId: string;
    readonly action: PartnerViewingAction;
    readonly note: string | null;
  }): Promise<Viewing> => {
    const scope = partnerScopeFor(input.principal, input.organizationId);
    const current =
      'organizationId' in scope
        ? await viewings.findForOrganization(scope.organizationId, input.viewingId)
        : await viewings.findForAgent(input.principal.userId, input.viewingId);
    if (!current) throw new ViewingNotFoundError('Viewing not found');
    const now = clock.now();
    const role = partnerRoleOf(scope);
    const status = nextViewingStatus(current.status, input.action, role, { now, scheduledAt: current.scheduledAt });

    const updated = await viewings.transition(scope, input.viewingId, {
      status,
      at: now,
      ...(input.note !== null ? { partnerNote: normaliseViewingNote(input.note) } : {}),
      ...(input.action === 'CANCEL' ? { cancelledByRole: role } : {}),
    });

    if (input.action === 'CONFIRM' && updated.inquiryId) {
      const inquiry =
        'organizationId' in scope
          ? await inquiries.findForOrganization(scope.organizationId, updated.inquiryId)
          : await inquiries.findForAgent(input.principal.userId, updated.inquiryId);
      if (inquiry) {
        const next = statusAfterViewingConfirmed(inquiry.status);
        if (next !== inquiry.status) await inquiries.setStatus(scope, inquiry.id, next, null);
      }
    }

    await notifications.publish([
      {
        audience: { userId: updated.customerId },
        kind: 'VIEWING_UPDATED',
        title: TITLES[input.action],
        body: `${updated.listingTitle} · ${formatViewingTime(updated.scheduledAt)}`,
        link: `/viewings/${updated.id}`,
      },
    ]);
    return updated;
  };
