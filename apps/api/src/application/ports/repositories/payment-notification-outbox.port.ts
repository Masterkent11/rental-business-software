export interface PaymentNotificationOutbox {
  deliverPending(limit: number): Promise<number>;
}
