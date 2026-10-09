import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { InquiryRepository } from '@/application/ports/repositories/inquiry-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { MessagingRepository } from '@/application/ports/repositories/messaging-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import { ListingNotFoundError } from '@/domain/listings/listing.ts';
import { InquiryNotAllowedError } from '@/domain/inquiries/inquiry.ts';
import {
  VIEWING_DURATION_MINUTES,
  assertBookableSlot,
  formatViewingTime,
  normaliseViewingNote,
  type Viewing,
} from '@/domain/viewings/viewing.ts';
import { previewOf } from '@/domain/messaging/conversation.ts';
import { PUBLIC } from '@/domain/shared/organization-scope.ts';
import type { NewNotification } from '@/domain/notifications/notification.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export const requestViewing =
  (
    viewings: ViewingRepository,
    listings: ListingRepository,
    inquiries: InquiryRepository,
    messaging: MessagingRepository,
    agents: AgentRepository,
    notifications: NotificationRepository,
    clock: Clock,
  ) =>
  async (input: {
    readonly principal: Principal;
    readonly listingId: string;
    readonly scheduledAt: Date;
    readonly note: string | null;
    readonly clientRef: string;
  }): Promise<{ readonly viewing: Viewing; readonly created: boolean }> => {
    const listing = await listings.findPublicById(PUBLIC, input.listingId);
    if (!listing || listing.state !== 'PUBLISHED') throw new ListingNotFoundError('That property is no longer listed');
    if (listing.intent !== 'SALE') throw new InquiryNotAllowedError('Viewings are scheduled for properties for sale');
    assertBookableSlot(input.scheduledAt, clock.now());
    const note = normaliseViewingNote(input.note);
    const [agentId, openInquiry] = await Promise.all([
      messaging.activeAgentForListing(listing.id),
      inquiries.openForCustomerListing(input.principal.userId, listing.id),
    ]);
    const when = formatViewingTime(input.scheduledAt);
    const requestMessage = note
      ? `I'd like to view this property on ${when}.\n\n${note}`
      : `I'd like to view this property on ${when}.`;

    const result = await viewings.submit({
      organizationId: listing.organizationId,
      listingId: listing.id,
      customerId: input.principal.userId,
      agentId,
      inquiryId: openInquiry?.id ?? null,
      scheduledAt: input.scheduledAt,
      durationMinutes: VIEWING_DURATION_MINUTES,
      customerNote: note,
      clientRef: input.clientRef,
      requestMessage,
      requestPreview: previewOf(requestMessage),
    });

    if (result.created) {
      const customer = input.principal.displayName || 'A buyer';
      const outgoing: NewNotification[] = [
        {
          audience: { organizationId: listing.organizationId },
          kind: 'VIEWING_REQUESTED',
          title: `${customer} requested a viewing`,
          body: `${listing.title} · ${when}`,
          link: `/viewings?v=${result.viewing.id}`,
        },
      ];
      if (agentId) {
        const agent = await agents.findPublic(agentId);
        if (agent) {
          outgoing.push({
            audience: { userId: agent.userId },
            kind: 'VIEWING_REQUESTED',
            title: `${customer} requested a viewing`,
            body: `${listing.title} · ${when}`,
            link: `/agent/viewings?v=${result.viewing.id}`,
          });
        }
      }
      await notifications.publish(outgoing);
    }
    return result;
  };
