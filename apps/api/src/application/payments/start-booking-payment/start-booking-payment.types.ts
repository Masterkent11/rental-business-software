import type { Centavos } from '@/domain/shared/money.ts';

export interface StartBookingPaymentInput {
  readonly occupancyId: string;
  readonly userId?: string;
}

export interface StartBookingPaymentResult {
  readonly paymentId: string;
  readonly amountCentavos: Centavos;
  readonly nights: number;
  readonly redirectUrl: string | null;
  readonly provider: string;
}
