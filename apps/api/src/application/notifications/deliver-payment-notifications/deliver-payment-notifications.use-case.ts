import type { PaymentNotificationOutbox } from '@/application/ports/repositories/payment-notification-outbox.port.ts';

export const deliverPaymentNotifications = (outbox: PaymentNotificationOutbox) =>
  () => outbox.deliverPending(50);
