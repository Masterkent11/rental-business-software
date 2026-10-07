import { Module } from '@nestjs/common';
import { CustomerConversationsController } from './controllers/customer-conversations.controller.ts';
import { OrganizationConversationsController } from './controllers/organization-conversations.controller.ts';
import {
  GET_CUSTOMER_THREAD,
  GET_ORGANIZATION_THREAD,
  LIST_MY_CONVERSATIONS,
  LIST_ORGANIZATION_CONVERSATIONS,
  MARK_CUSTOMER_READ,
  MARK_ORGANIZATION_READ,
  SEND_CUSTOMER_MESSAGE,
  SEND_OWNER_MESSAGE,
  START_CONVERSATION,
} from './messaging.tokens.ts';
import { CLOCK, MESSAGING_REPOSITORY, NOTIFICATION_REPOSITORY } from '@/modules/shared/shared.tokens.ts';
import { startConversation } from '@/application/messaging/start-conversation/start-conversation.use-case.ts';
import { listMyConversations } from '@/application/messaging/list-my-conversations/list-my-conversations.use-case.ts';
import { listOrganizationConversations } from '@/application/messaging/list-organization-conversations/list-organization-conversations.use-case.ts';
import {
  getCustomerThread,
  getOrganizationThread,
} from '@/application/messaging/get-conversation-messages/get-conversation-messages.use-case.ts';
import {
  sendCustomerMessage,
  sendOwnerMessage,
} from '@/application/messaging/send-message/send-message.use-case.ts';
import {
  markCustomerConversationRead,
  markOrganizationConversationRead,
} from '@/application/messaging/mark-conversation-read/mark-conversation-read.use-case.ts';
import type { MessagingRepository } from '@/application/ports/repositories/messaging-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';

@Module({
  controllers: [CustomerConversationsController, OrganizationConversationsController],
  providers: [
    {
      provide: START_CONVERSATION,
      inject: [MESSAGING_REPOSITORY],
      useFactory: (repo: MessagingRepository) => startConversation(repo),
    },
    {
      provide: LIST_MY_CONVERSATIONS,
      inject: [MESSAGING_REPOSITORY],
      useFactory: (repo: MessagingRepository) => listMyConversations(repo),
    },
    {
      provide: LIST_ORGANIZATION_CONVERSATIONS,
      inject: [MESSAGING_REPOSITORY],
      useFactory: (repo: MessagingRepository) => listOrganizationConversations(repo),
    },
    {
      provide: GET_CUSTOMER_THREAD,
      inject: [MESSAGING_REPOSITORY],
      useFactory: (repo: MessagingRepository) => getCustomerThread(repo),
    },
    {
      provide: GET_ORGANIZATION_THREAD,
      inject: [MESSAGING_REPOSITORY],
      useFactory: (repo: MessagingRepository) => getOrganizationThread(repo),
    },
    {
      provide: SEND_CUSTOMER_MESSAGE,
      inject: [MESSAGING_REPOSITORY, NOTIFICATION_REPOSITORY, CLOCK],
      useFactory: (repo: MessagingRepository, notifications: NotificationRepository, clock: Clock) =>
        sendCustomerMessage(repo, notifications, clock),
    },
    {
      provide: SEND_OWNER_MESSAGE,
      inject: [MESSAGING_REPOSITORY, NOTIFICATION_REPOSITORY, CLOCK],
      useFactory: (repo: MessagingRepository, notifications: NotificationRepository, clock: Clock) =>
        sendOwnerMessage(repo, notifications, clock),
    },
    {
      provide: MARK_CUSTOMER_READ,
      inject: [MESSAGING_REPOSITORY],
      useFactory: (repo: MessagingRepository) => markCustomerConversationRead(repo),
    },
    {
      provide: MARK_ORGANIZATION_READ,
      inject: [MESSAGING_REPOSITORY],
      useFactory: (repo: MessagingRepository) => markOrganizationConversationRead(repo),
    },
  ],
})
export class MessagingModule {}
