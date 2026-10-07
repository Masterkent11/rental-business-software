import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export const markMyNotificationsRead =
  (notifications: NotificationRepository) =>
  async (input: { readonly principal: Principal; readonly ids: readonly string[] | 'ALL' }): Promise<void> =>
    notifications.markUserRead(input.principal.userId, input.ids);

export const markOrganizationNotificationsRead =
  (notifications: NotificationRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly ids: readonly string[] | 'ALL';
  }): Promise<void> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    await notifications.markOrganizationRead(input.organizationId, input.ids);
  };
