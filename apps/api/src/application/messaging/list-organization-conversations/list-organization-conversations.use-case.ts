import type { MessagingRepository } from '@/application/ports/repositories/messaging-repository.port.ts';
import type { Conversation } from '@/domain/messaging/conversation.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export const listOrganizationConversations =
  (messaging: MessagingRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
  }): Promise<readonly Conversation[]> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    return messaging.listForOrganization(input.organizationId);
  };
