import type { ReservationState } from '@/domain/reservations/reservation-state.ts';
import { centavos, type Centavos } from '@/domain/shared/money.ts';
import type { PaymentState } from './payment-state.ts';
import type { OccupancyState } from '@/domain/occupancy/occupancy-state.ts';
import { PaymentNotPendingError, InvalidPaymentOccupancyError } from './payment-errors.ts';
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
  if (!Number.isSafeInteger(nights) || nights <= 0) {
    throw new InvalidPaymentAmountError('A stay must be at least one night');
  }
  // Integer arithmetic throughout. No floating point may touch an amount, at
  // any layer — a rate times a night count is exact, and must stay that way.
  try {
    return centavos(centavos(nightlyRateCentavos) * nights);
  } catch (error) {
    if (error instanceof RangeError) throw new InvalidPaymentAmountError('The stay amount must be exact whole centavos within the supported range');
    throw error;
  }
}

export function assertPaymentMayConfirm(paymentState: PaymentState, occupancyState: OccupancyState): void {
  if (paymentState !== 'PENDING') throw new PaymentNotPendingError('That payment is not waiting for confirmation');
  if (occupancyState !== 'HELD') throw new InvalidPaymentOccupancyError('That hold is no longer eligible for confirmation');
}

export function assertReservationMayReceivePayment(state: ReservationState): void {
  if (state !== 'PENDING_PAYMENT') throw new PaymentNotPendingError('That reservation is not waiting for payment');
}
