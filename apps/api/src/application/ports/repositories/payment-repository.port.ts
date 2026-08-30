import type { Centavos } from '@/domain/shared/money.ts';
import type { Payment } from '@/domain/payments/payment.ts';

export class BookingNotHeldError extends Error {}
export class AmountMismatchError extends Error {}

export interface BookingForPayment {
  readonly occupancyId: string;
  readonly organizationId: string;
  readonly amountCentavos: Centavos;
  readonly nights: number;
}

export interface ConfirmationResult {
  readonly payment: Payment;
  readonly stayId: string;
  /** False when the event had already been applied. */
  readonly applied: boolean;
}

export interface PendingPayment {
  readonly occupancyId: string;
  readonly providerRef: string;
  readonly amountCentavos: Centavos;
  /** Who placed the hold this payment is for, if anyone. */
  readonly heldBy: string | null;
}

export interface PaymentRepository {
  findPayableBooking(occupancyId: string): Promise<BookingForPayment | null>;
  findPendingPayment(input: {
    paymentId: string;
    occupancyId: string;
  }): Promise<PendingPayment | null>;
  startPayment(input: {
    occupancyId: string;
    amountCentavos: Centavos;
    providerRef: string;
  }): Promise<Payment>;
  confirmPayment(input: {
    providerEventId: string;
    provider: string;
    providerRef: string;
    amountCentavos: Centavos;
    occurredAt: Date;
    rawPayload: string;
  }): Promise<ConfirmationResult>;
}
