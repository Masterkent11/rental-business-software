import type { MessagingRepository } from '@/application/ports/repositories/messaging-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import {
  ConversationNotFoundError,
  normaliseMessageBody,
  previewOf,
  shouldNotifyRecipient,
  type Conversation,
  type Message,
  type ParticipantRole,
} from '@/domain/messaging/conversation.ts';
import type { NewNotification } from '@/domain/notifications/notification.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

async function deliver(
  messaging: MessagingRepository,
  notifications: NotificationRepository,
  clock: Clock,
  input: {
    readonly conversation: Conversation;
    readonly senderId: string;
    readonly senderRole: ParticipantRole;
    readonly body: string;
    readonly clientId: string;
    readonly scope: { readonly customerId: string } | { readonly organizationId: string };
  },
): Promise<Message> {
  const body = normaliseMessageBody(input.body);
  const preview = previewOf(body);
  const { message, created } = await messaging.append({
    conversation: input.conversation,
    senderId: input.senderId,
    senderRole: input.senderRole,
    body,
    preview,
    clientId: input.clientId,
    scope: input.scope,
  });

  if (
    created &&
    shouldNotifyRecipient({
      previousSenderRole: input.conversation.lastSenderRole,
      previousMessageAt: input.conversation.lastMessageAt,
      senderRole: input.senderRole,
      now: clock.now(),
    })
  ) {
    const notification: NewNotification =
      input.senderRole === 'CUSTOMER'
        ? {
            audience: { organizationId: input.conversation.organizationId },
            kind: 'MESSAGE_RECEIVED',
            title: `New message from ${input.conversation.customerName || 'a guest'}`,
            body: `${input.conversation.listingTitle}: ${preview}`,
            link: `/messages?c=${input.conversation.id}`,
          }
        : {
            audience: { userId: input.conversation.customerId },
            kind: 'MESSAGE_RECEIVED',
            title: `${input.conversation.organizationName} replied`,
            body: preview,
            link: `/messages/${input.conversation.id}`,
          };
    await notifications.publish([notification]);
  }

  return message;
}

export const sendCustomerMessage =
  (messaging: MessagingRepository, notifications: NotificationRepository, clock: Clock) =>
  async (input: {
    readonly principal: Principal;
    readonly conversationId: string;
    readonly body: string;
    readonly clientId: string;
  }): Promise<Message> => {
    const conversation = await messaging.findForCustomer(input.principal.userId, input.conversationId);
    if (!conversation) throw new ConversationNotFoundError('Conversation not found');
    return deliver(messaging, notifications, clock, {
      conversation,
      senderId: input.principal.userId,
      senderRole: 'CUSTOMER',
      body: input.body,
      clientId: input.clientId,
      scope: { customerId: input.principal.userId },
    });
  };

export const sendOwnerMessage =
  (messaging: MessagingRepository, notifications: NotificationRepository, clock: Clock) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly conversationId: string;
    readonly body: string;
    readonly clientId: string;
  }): Promise<Message> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const conversation = await messaging.findForOrganization(input.organizationId, input.conversationId);
    if (!conversation) throw new ConversationNotFoundError('Conversation not found');
    return deliver(messaging, notifications, clock, {
      conversation,
      senderId: input.principal.userId,
      senderRole: 'OWNER',
      body: input.body,
      clientId: input.clientId,
      scope: { organizationId: input.organizationId },
    });
  };
