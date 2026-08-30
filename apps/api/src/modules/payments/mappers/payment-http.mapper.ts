import type { ConfirmationResult } from '@/application/ports/repositories/payment-repository.port.ts';

export const toPaymentConfirmationHttpResponse = (result: ConfirmationResult | null) => ({
  applied: result?.applied ?? false,
  stayId: result?.stayId ?? null,
});
