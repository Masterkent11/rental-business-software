import type { PaymentGateway } from '@/application/ports/providers/payment-gateway.port.ts';
import {
  BookingNotHeldError,
  type PaymentRepository,
} from '@/application/ports/repositories/payment-repository.port.ts';
import type {
  StartBookingPaymentInput,
  StartBookingPaymentResult,
} from './start-booking-payment.types.ts';

export function startBookingPayment(
  payments: PaymentRepository,
  gateway: PaymentGateway,
) {
  return async function execute(
    input: StartBookingPaymentInput,
  ): Promise<StartBookingPaymentResult> {
    const booking = await payments.findPayableBooking(input.occupancyId);
    if (!booking) {
      throw new BookingNotHeldError('That hold is no longer live');
    }

    const intent = await gateway.startPayment({
      amountCentavos: booking.amountCentavos,
      reference: booking.occupancyId,
    });

    const payment = await payments.startPayment({
      occupancyId: booking.occupancyId,
      amountCentavos: booking.amountCentavos,
      providerRef: intent.providerRef,
    });

    return {
      paymentId: payment.id,
      amountCentavos: booking.amountCentavos,
      nights: booking.nights,
      redirectUrl: intent.redirectUrl,
    };
  };
}
