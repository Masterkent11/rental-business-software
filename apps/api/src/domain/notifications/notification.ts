export type NotificationKind =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_RECEIVED'
  | 'BOOKING_UPDATED'
  | 'MESSAGE_RECEIVED'
  | 'APPLICATION_RECEIVED'
  | 'APPLICATION_DECIDED'
  | 'INQUIRY_RECEIVED'
  | 'INQUIRY_UPDATED'
  | 'VIEWING_REQUESTED'
  | 'VIEWING_UPDATED'
  | 'REPRESENTATION_INVITED'
  | 'REPRESENTATION_UPDATED';

export interface Notification {
  readonly id: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly link: string | null;
  readonly readAt: Date | null;
  readonly createdAt: Date;
}

export type NotificationAudience =
  | { readonly userId: string; readonly organizationId?: string | null }
  | { readonly userId?: null; readonly organizationId: string };

export interface NewNotification {
  readonly audience: NotificationAudience;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly link: string | null;
}
