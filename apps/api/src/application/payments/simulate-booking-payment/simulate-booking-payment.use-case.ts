import type { PaymentGateway } from '@/application/ports/providers/payment-gateway.port.ts';
import {
  BookingNotHeldError,
  type ConfirmationResult,
  type PaymentRepository,
} from '@/application/ports/repositories/payment-repository.port.ts';
import type { confirmBookingPayment } from '@/application/payments/confirm-booking-payment/confirm-booking-payment.use-case.ts';
import type { SimulateBookingPaymentInput } from './simulate-booking-payment.types.ts';

export class PaymentNotOwnedError extends Error {}
export class SimulationUnavailableError extends Error {}

export function simulateBookingPayment(
  payments: PaymentRepository,
  gateway: PaymentGateway,
  confirm: ReturnType<typeof confirmBookingPayment>,
) {
  return async function execute(
    input: SimulateBookingPaymentInput,
  ): Promise<ConfirmationResult | null> {
    const pending = await payments.findPendingPayment({
      paymentId: input.paymentId,
      occupancyId: input.occupancyId,
    });
    if (!pending) {
      throw new BookingNotHeldError('That payment is not waiting to be confirmed');
    }

    if (pending.heldBy !== input.userId) {
      throw new PaymentNotOwnedError('That payment does not belong to you');
    }

    if (!gateway.simulateSuccess) {
      throw new SimulationUnavailableError(
        `${gateway.provider} has no sandbox confirmation to simulate`,
      );
    }

    const { rawBody, signature } = gateway.simulateSuccess({
      providerRef: pending.providerRef,
      amountCentavos: pending.amountCentavos,
    });

    return confirm({ rawBody, signature });
  };
}
