import type { Message } from "../../domain/messaging/conversation";
import type { AppNotification } from "../../domain/notifications/notification";
import type { PartnerScope } from "../../domain/workspace/workspace";

export type Unsubscribe = () => void;

export type RealtimeStatus = "connecting" | "live" | "offline";

export interface RealtimePort {
  watchMessages(
    scope: PartnerScope,
    onMessage: (message: Message) => void,
    onStatus: (status: RealtimeStatus) => void,
  ): Unsubscribe;
  watchNotifications(
    scope: PartnerScope,
    userId: string,
    onNotification: (notification: AppNotification) => void,
  ): Unsubscribe;
  watchActivity(scope: PartnerScope, onChange: (table: "inquiries" | "viewings") => void): Unsubscribe;
}
