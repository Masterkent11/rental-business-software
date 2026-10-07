import type { Notification } from '@/domain/notifications/notification.ts';

export const toNotificationHttpResponse = (notification: Notification) => ({
  id: notification.id,
  kind: notification.kind,
  title: notification.title,
  body: notification.body,
  link: notification.link,
  readAt: notification.readAt?.toISOString() ?? null,
  createdAt: notification.createdAt.toISOString(),
});
