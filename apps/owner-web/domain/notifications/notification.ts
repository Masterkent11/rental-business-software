export type NotificationKind =
  | "BOOKING_CONFIRMED"
  | "BOOKING_RECEIVED"
  | "BOOKING_UPDATED"
  | "MESSAGE_RECEIVED"
  | "APPLICATION_RECEIVED"
  | "APPLICATION_DECIDED";

export interface AppNotification {
  readonly id: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly link: string | null;
  readonly readAt: string | null;
  readonly createdAt: string;
}
