import type { MessagingRepository } from '@/application/ports/repositories/messaging-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { assignLead } from '@/application/assignment/assign-lead/assign-lead.use-case.ts';
import { assignableListing } from '@/application/assignment/assignable-listing.rules.ts';
import { PUBLIC } from '@/domain/shared/organization-scope.ts';
import {
  ConversationNotAllowedError,
  ConversationNotFoundError,
  type Conversation,
} from '@/domain/messaging/conversation.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export const startConversation =
  (messaging: MessagingRepository, listings: ListingRepository, assign: ReturnType<typeof assignLead>) =>
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

    let agentId: string | null = null;
    if (context.listingPublished && !occupancyId) {
      const listing = await listings.findPublicById(PUBLIC, context.listingId);
      if (listing) {
        const assignment = await assign({ listing: assignableListing(listing), customerId: input.principal.userId, referralCode: null });
        agentId = assignment?.agentId ?? null;
      }
    }
    return messaging.openForCustomer({
      organizationId: context.organizationId,
      listingId: context.listingId,
      customerId: input.principal.userId,
      occupancyId,
      agentId,
    });
  };
