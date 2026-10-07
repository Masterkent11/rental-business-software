import type { Message } from "../../domain/messaging/conversation";
import type { AppNotification } from "../../domain/notifications/notification";

export type Unsubscribe = () => void;

export type RealtimeStatus = "connecting" | "live" | "offline";

export interface RealtimePort {
  watchOrganizationMessages(
    organizationId: string,
    onMessage: (message: Message) => void,
    onStatus: (status: RealtimeStatus) => void,
  ): Unsubscribe;
  watchOrganizationNotifications(
    organizationId: string,
    onNotification: (notification: AppNotification) => void,
  ): Unsubscribe;
}
