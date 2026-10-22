import type { InquiryRepository, SubmittedInquiry } from '@/application/ports/repositories/inquiry-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { assignLead } from '@/application/assignment/assign-lead/assign-lead.use-case.ts';
import { assignableListing } from '@/application/assignment/assignable-listing.rules.ts';
import {
  InquiryNotAllowedError,
  assertBuyerBudget,
  composeInquiryOpening,
  normaliseInquiryMessage,
  normaliseInquiryQuestions,
} from '@/domain/inquiries/inquiry.ts';
import { ListingNotFoundError } from '@/domain/listings/listing.ts';
import { previewOf } from '@/domain/messaging/conversation.ts';
import { PUBLIC } from '@/domain/shared/organization-scope.ts';
import type { NewNotification } from '@/domain/notifications/notification.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export interface SubmitInquiryCommand {
  readonly principal: Principal;
  readonly listingId: string;
  readonly message: string;
  readonly questions: readonly string[];
  readonly buyerBudgetCentavos: number | null;
  readonly clientRef: string;
  readonly referralCode: string | null;
}

export const submitInquiry =
  (
    inquiries: InquiryRepository,
    listings: ListingRepository,
    agents: AgentRepository,
    notifications: NotificationRepository,
    assign: ReturnType<typeof assignLead>,
  ) =>
  async (command: SubmitInquiryCommand): Promise<SubmittedInquiry> => {
    const listing = await listings.findPublicById(PUBLIC, command.listingId);
    if (!listing || listing.state !== 'PUBLISHED') throw new ListingNotFoundError('That property is no longer listed');
    if (listing.intent !== 'SALE') {
      throw new InquiryNotAllowedError('Rentals are booked or applied for from the listing');
    }
    const message = normaliseInquiryMessage(command.message);
    const questions = normaliseInquiryQuestions(command.questions);
    assertBuyerBudget(command.buyerBudgetCentavos);
    const opening = composeInquiryOpening(message, questions);
    const assignment = await assign({
      listing: assignableListing(listing),
      customerId: command.principal.userId,
      referralCode: command.referralCode,
    });
    const agentId = assignment?.agentId ?? null;

    const result = await inquiries.submit({
      organizationId: listing.organizationId,
      listingId: listing.id,
      customerId: command.principal.userId,
      agentId,
      message,
      questions,
      buyerBudgetCentavos: command.buyerBudgetCentavos,
      clientRef: command.clientRef,
      opening,
      openingPreview: previewOf(opening),
    });

    if (result.created) {
      const customer = command.principal.displayName || 'A buyer';
      const outgoing: NewNotification[] = [
        {
          audience: { organizationId: listing.organizationId },
          kind: 'INQUIRY_RECEIVED',
          title: `New inquiry from ${customer}`,
          body: listing.title,
          link: `/inquiries?i=${result.inquiry.id}`,
        },
      ];
      if (agentId) {
        const agent = await agents.findAssigned(command.principal.userId, agentId);
        if (agent) {
          outgoing.push({
            audience: { userId: agent.userId },
            kind: 'INQUIRY_RECEIVED',
            title: `New lead from ${customer}`,
            body: listing.title,
            link: `/agent/leads?i=${result.inquiry.id}`,
          });
        }
      }
      await notifications.publish(outgoing);
    }
    return result;
  };
