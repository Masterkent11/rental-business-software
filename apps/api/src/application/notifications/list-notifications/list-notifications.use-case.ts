import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { Notification } from '@/domain/notifications/notification.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

const LIMIT = 50;

export const listMyNotifications =
  (notifications: NotificationRepository) =>
  async (input: { readonly principal: Principal }): Promise<readonly Notification[]> =>
    notifications.forUser(input.principal.userId, LIMIT);

export const listOrganizationNotifications =
  (notifications: NotificationRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
  }): Promise<readonly Notification[]> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    return notifications.forOrganization(input.organizationId, LIMIT);
  };
