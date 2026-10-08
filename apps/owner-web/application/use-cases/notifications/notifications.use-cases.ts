import type { PartnerRepositoryPort } from "../../ports/partner-repository.port";
import type { RealtimePort, Unsubscribe } from "../../ports/realtime.port";
import type { AppNotification } from "../../../domain/notifications/notification";
import type { PartnerScope } from "../../../domain/workspace/workspace";

export class LoadNotificationsUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  async execute(scope: PartnerScope): Promise<{ notifications: readonly AppNotification[]; unreadCount: number }> {
    return this.repository.getNotifications(scope);
  }
}

export class MarkNotificationsReadUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  async execute(scope: PartnerScope): Promise<void> {
    return this.repository.markNotificationsRead(scope);
  }
}

export class WatchNotificationsUseCase {
  constructor(private readonly realtime: RealtimePort) {}
  execute(scope: PartnerScope, userId: string, onNotification: (notification: AppNotification) => void): Unsubscribe {
    return this.realtime.watchNotifications(scope, userId, onNotification);
  }
}

export class WatchActivityUseCase {
  constructor(private readonly realtime: RealtimePort) {}
  execute(scope: PartnerScope, onChange: (table: "inquiries" | "viewings") => void): Unsubscribe {
    return this.realtime.watchActivity(scope, onChange);
  }
}
