import type { OwnerRepositoryPort } from "../../ports/owner-repository.port";
import type { RealtimePort, Unsubscribe } from "../../ports/realtime.port";
import type { AppNotification } from "../../../domain/notifications/notification";

export class LoadNotificationsUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string): Promise<{ notifications: readonly AppNotification[]; unreadCount: number }> {
    return this.repository.getNotifications(organizationId);
  }
}

export class MarkNotificationsReadUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string): Promise<void> {
    return this.repository.markNotificationsRead(organizationId);
  }
}

export class WatchNotificationsUseCase {
  constructor(private readonly realtime: RealtimePort) {}
  execute(organizationId: string, onNotification: (notification: AppNotification) => void): Unsubscribe {
    return this.realtime.watchOrganizationNotifications(organizationId, onNotification);
  }
}
