import type { MessagingRepository } from '@/application/ports/repositories/messaging-repository.port.ts';
import type { Conversation } from '@/domain/messaging/conversation.ts';
import { hasCapability, type Principal } from '@/domain/identity/identity.ts';
import { RepresentationForbiddenError } from '@/domain/agents/agent.ts';

export const listAgentConversations =
  (messaging: MessagingRepository) =>
  async (input: { readonly principal: Principal }): Promise<readonly Conversation[]> => {
    if (!hasCapability(input.principal, 'AGENT')) throw new RepresentationForbiddenError('Only agents can do that');
    return messaging.listForAgent(input.principal.userId);
  };
