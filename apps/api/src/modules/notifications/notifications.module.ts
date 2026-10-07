import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller.ts';
import {
  LIST_MY_NOTIFICATIONS,
  LIST_ORGANIZATION_NOTIFICATIONS,
  MARK_MY_NOTIFICATIONS_READ,
  MARK_ORGANIZATION_NOTIFICATIONS_READ,
} from './notifications.tokens.ts';
import { NOTIFICATION_REPOSITORY } from '@/modules/shared/shared.tokens.ts';
import {
  listMyNotifications,
  listOrganizationNotifications,
} from '@/application/notifications/list-notifications/list-notifications.use-case.ts';
import {
  markMyNotificationsRead,
  markOrganizationNotificationsRead,
} from '@/application/notifications/mark-notifications-read/mark-notifications-read.use-case.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';

@Module({
  controllers: [NotificationsController],
  providers: [
    {
      provide: LIST_MY_NOTIFICATIONS,
      inject: [NOTIFICATION_REPOSITORY],
      useFactory: (repo: NotificationRepository) => listMyNotifications(repo),
    },
    {
      provide: LIST_ORGANIZATION_NOTIFICATIONS,
      inject: [NOTIFICATION_REPOSITORY],
      useFactory: (repo: NotificationRepository) => listOrganizationNotifications(repo),
    },
    {
      provide: MARK_MY_NOTIFICATIONS_READ,
      inject: [NOTIFICATION_REPOSITORY],
      useFactory: (repo: NotificationRepository) => markMyNotificationsRead(repo),
    },
    {
      provide: MARK_ORGANIZATION_NOTIFICATIONS_READ,
      inject: [NOTIFICATION_REPOSITORY],
      useFactory: (repo: NotificationRepository) => markOrganizationNotificationsRead(repo),
    },
  ],
})
export class NotificationsModule {}
