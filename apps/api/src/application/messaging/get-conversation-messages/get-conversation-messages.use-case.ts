import type { MessagingRepository } from '@/application/ports/repositories/messaging-repository.port.ts';
import {
  ConversationNotFoundError,
  MESSAGE_PAGE_SIZE,
  type Conversation,
  type Message,
} from '@/domain/messaging/conversation.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface ConversationThread {
  readonly conversation: Conversation;
  readonly messages: readonly Message[];
  readonly hasMore: boolean;
}

const clampLimit = (limit: number | undefined) =>
  Math.min(Math.max(limit ?? MESSAGE_PAGE_SIZE, 1), 100);

export const getCustomerThread =
  (messaging: MessagingRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly conversationId: string;
    readonly before: Date | null;
    readonly limit?: number;
  }): Promise<ConversationThread> => {
    const conversation = await messaging.findForCustomer(input.principal.userId, input.conversationId);
    if (!conversation) throw new ConversationNotFoundError('Conversation not found');
    const limit = clampLimit(input.limit);
    const messages = await messaging.messages({
      conversationId: conversation.id,
      scope: { customerId: input.principal.userId },
      before: input.before,
      limit: limit + 1,
    });
    return {
      conversation,
      messages: messages.slice(-limit),
      hasMore: messages.length > limit,
    };
  };

export const getOrganizationThread =
  (messaging: MessagingRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly conversationId: string;
    readonly before: Date | null;
    readonly limit?: number;
  }): Promise<ConversationThread> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const conversation = await messaging.findForOrganization(input.organizationId, input.conversationId);
    if (!conversation) throw new ConversationNotFoundError('Conversation not found');
    const limit = clampLimit(input.limit);
    const messages = await messaging.messages({
      conversationId: conversation.id,
      scope: { organizationId: input.organizationId },
      before: input.before,
      limit: limit + 1,
    });
    return {
      conversation,
      messages: messages.slice(-limit),
      hasMore: messages.length > limit,
    };
  };
