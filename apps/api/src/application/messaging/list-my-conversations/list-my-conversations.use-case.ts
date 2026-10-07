import type { MessagingRepository } from '@/application/ports/repositories/messaging-repository.port.ts';
import type { Conversation } from '@/domain/messaging/conversation.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export const listMyConversations =
  (messaging: MessagingRepository) =>
  async (input: { readonly principal: Principal }): Promise<readonly Conversation[]> =>
    messaging.listForCustomer(input.principal.userId);
