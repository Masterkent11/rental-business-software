import type { Centavos } from '@/domain/shared/money.ts';
import { InvalidPaymentAmountError } from './payment-errors.ts';

/**
 * What a stay costs, up front.
 *
 * Short-term is prepaid in full and raises no invoice — there is no claim to
 * settle later, so there is nothing for an invoice to be about.
 */
export function stayTotalCentavos(
  nightlyRateCentavos: Centavos,
  nights: number,
): Centavos {
  if (nights <= 0) {
    throw new InvalidPaymentAmountError('A stay must be at least one night');
  }
  // Integer arithmetic throughout. No floating point may touch an amount, at
  // any layer — a rate times a night count is exact, and must stay that way.
  return (nightlyRateCentavos * nights) as Centavos;
}
