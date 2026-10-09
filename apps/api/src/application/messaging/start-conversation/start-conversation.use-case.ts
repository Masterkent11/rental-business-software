import type { MessagingRepository } from '@/application/ports/repositories/messaging-repository.port.ts';
import {
  ConversationNotAllowedError,
  ConversationNotFoundError,
  type Conversation,
} from '@/domain/messaging/conversation.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export const startConversation =
  (messaging: MessagingRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly listingId: string;
    readonly bookingId: string | null;
  }): Promise<Conversation> => {
    const context = await messaging.listingContext(input.listingId);
    if (!context) throw new ConversationNotFoundError('That place could not be found');

    let occupancyId: string | null = null;
    if (input.bookingId) {
      const owns = await messaging.customerHasBookingFor(
        input.principal.userId,
        input.listingId,
        input.bookingId,
      );
      if (!owns) throw new ConversationNotAllowedError('That booking is not yours');
      occupancyId = input.bookingId;
    } else if (!context.listingPublished) {
      throw new ConversationNotAllowedError('This place is no longer listed');
    }

    const agentId = context.listingPublished ? await messaging.activeAgentForListing(context.listingId) : null;
    return messaging.openForCustomer({
      organizationId: context.organizationId,
      listingId: context.listingId,
      customerId: input.principal.userId,
      occupancyId,
      agentId,
    });
  };
