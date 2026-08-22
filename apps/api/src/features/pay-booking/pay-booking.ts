import type { PaymentGateway } from '../../application/ports/payment-gateway.ts';
import {
  BookingNotHeldError,
  type ConfirmationResult,
  type PaymentRepository,
} from '../../application/ports/payment-repository.ts';

/**
 * Start paying for a held booking.
 *
 * The amount comes from the database, priced off the listing — never from the
 * request. A client-supplied amount is a client deciding what to pay.
 */
export const startBookingPayment =
  (payments: PaymentRepository, gateway: PaymentGateway) =>
  async (input: { occupancyId: string }) => {
    const booking = await payments.findPayableBooking(input.occupancyId);
    if (!booking) {
      // Expired, already paid, or never held. All the same to the caller:
      // there is nothing here to pay for.
      throw new BookingNotHeldError('That hold is no longer live');
    }

    const intent = await gateway.startPayment({
      amountCentavos: booking.amountCentavos,
      reference: booking.occupancyId,
    });

    // Recorded PENDING before the customer is sent anywhere. If the callback
    // arrives while they are still on the provider's page — which it can —
    // there has to be a payment row for it to land on.
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

/**
 * Apply a provider callback.
 *
 * Verification first: an unverified callback is an instruction from a stranger
 * to mark money as received. Then idempotently, because providers retry and
 * applying a payment twice is a refund conversation.
 */
export const confirmBookingPayment =
  (payments: PaymentRepository, gateway: PaymentGateway) =>
  async (input: {
    rawBody: string;
    signature: string | undefined;
  }): Promise<ConfirmationResult | null> => {
    const event = gateway.verifyWebhook(input);

    if (!event.succeeded) {
      // A failed attempt leaves the hold alone: the customer may try again
      // before it expires, and cancelling their nights on a declined card
      // would be the platform giving up on their behalf.
      return null;
    }

    return payments.confirmPayment({
      providerEventId: event.eventId,
      provider: gateway.provider,
      providerRef: event.providerRef,
      amountCentavos: event.amountCentavos,
      occurredAt: event.occurredAt,
      rawPayload: input.rawBody,
    });
  };
