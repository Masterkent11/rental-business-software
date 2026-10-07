import type { PaymentGateway } from '@/application/ports/providers/payment-gateway.port.ts';
import {
  BookingNotHeldError,
  type BookingForPayment,
  type PaymentRepository,
} from '@/application/ports/repositories/payment-repository.port.ts';
import { quoteStay } from '@/domain/bookings/booking.ts';
import { dateRange } from '@/domain/occupancy/occupancy.ts';
import type { Centavos } from '@/domain/shared/money.ts';
import type {
  StartBookingPaymentInput,
  StartBookingPaymentResult,
} from './start-booking-payment.types.ts';

export class PaymentNotYoursError extends Error {}

export function amountDue(booking: BookingForPayment): { amountCentavos: Centavos; nights: number } {
  if (booking.pricing.kind === 'FIXED') {
    return { amountCentavos: booking.pricing.amountCentavos, nights: 0 };
  }
  const pricing = booking.pricing;
  const quote = quoteStay(
    {
      nightlyCentavos: pricing.nightlyCentavos,
      cleaningFeeCentavos: pricing.cleaningFeeCentavos,
      minStayNights: pricing.minStayNights,
      maxOccupants: pricing.maxOccupants,
    },
    dateRange(pricing.startsOn, pricing.endsOn),
    pricing.guests,
  );
  return { amountCentavos: quote.totalCentavos, nights: quote.nights };
}

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
    if (input.userId !== undefined && booking.heldBy !== null && booking.heldBy !== input.userId) {
      throw new PaymentNotYoursError('That booking does not belong to you');
    }

    const { amountCentavos, nights } = amountDue(booking);

    const intent = await gateway.startPayment({
      amountCentavos,
      reference: booking.occupancyId,
    });

    const payment = await payments.startPayment({
      occupancyId: booking.occupancyId,
      amountCentavos,
      providerRef: intent.providerRef,
    });

    return {
      paymentId: payment.id,
      amountCentavos,
      nights,
      redirectUrl: intent.redirectUrl,
      provider: gateway.provider,
    };
  };
}
