import type { ConfirmationResult } from '@/application/ports/repositories/payment-repository.port.ts';

export interface ConfirmBookingPaymentInput {
  readonly rawBody: string;
  readonly signature: string | undefined;
}

export type ConfirmBookingPaymentResult = ConfirmationResult | null;
