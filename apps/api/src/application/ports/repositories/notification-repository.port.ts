import type { NewNotification, Notification } from '@/domain/notifications/notification.ts';

export interface NotificationRepository {
  publish(notifications: readonly NewNotification[]): Promise<void>;
  forUser(userId: string, limit: number): Promise<readonly Notification[]>;
  forOrganization(organizationId: string, limit: number): Promise<readonly Notification[]>;
  markUserRead(userId: string, ids: readonly string[] | 'ALL'): Promise<void>;
  markOrganizationRead(organizationId: string, ids: readonly string[] | 'ALL'): Promise<void>;
}
