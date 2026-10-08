import type { MessagingRepository } from '@/application/ports/repositories/messaging-repository.port.ts';
import { ConversationNotFoundError } from '@/domain/messaging/conversation.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export const markCustomerConversationRead =
  (messaging: MessagingRepository) =>
  async (input: { readonly principal: Principal; readonly conversationId: string }): Promise<void> => {
    const conversation = await messaging.findForCustomer(input.principal.userId, input.conversationId);
    if (!conversation) throw new ConversationNotFoundError('Conversation not found');
    await messaging.markRead({
      conversationId: conversation.id,
      role: 'CUSTOMER',
      scope: { customerId: input.principal.userId },
    });
  };

export const markOrganizationConversationRead =
  (messaging: MessagingRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly conversationId: string;
  }): Promise<void> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const conversation = await messaging.findForOrganization(input.organizationId, input.conversationId);
    if (!conversation) throw new ConversationNotFoundError('Conversation not found');
    await messaging.markRead({
      conversationId: conversation.id,
      role: 'OWNER',
      scope: { organizationId: input.organizationId },
    });
  };

export const markAgentConversationRead =
  (messaging: MessagingRepository) =>
  async (input: { readonly principal: Principal; readonly conversationId: string }): Promise<void> => {
    const conversation = await messaging.findForAgent(input.principal.userId, input.conversationId);
    if (!conversation) throw new ConversationNotFoundError('Conversation not found');
    await messaging.markRead({
      conversationId: conversation.id,
      role: 'AGENT',
      scope: { agentUserId: input.principal.userId },
    });
  };
