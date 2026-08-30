import type { ConfirmationResult } from '@/application/ports/repositories/payment-repository.port.ts';

export interface SimulateBookingPaymentInput {
  readonly occupancyId: string;
  readonly paymentId: string;
  readonly userId: string;
}

export type SimulateBookingPaymentResult = ConfirmationResult | null;
