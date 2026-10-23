import type { PaymentGateway } from '@/application/ports/providers/payment-gateway.port.ts';
import type {
  ConfirmationResult,
  PaymentRepository,
} from '@/application/ports/repositories/payment-repository.port.ts';
import type { ConfirmBookingPaymentInput } from './confirm-booking-payment.types.ts';

export function confirmBookingPayment(
  payments: PaymentRepository,
  gateway: PaymentGateway,
) {
  return async function execute(
    input: ConfirmBookingPaymentInput,
  ): Promise<ConfirmationResult | null> {
    const event = gateway.verifyWebhook(input);

    if (!event.succeeded) {
      return null;
    }

    const result = await payments.confirmPayment({
      providerEventId: event.eventId,
      provider: gateway.provider,
      providerRef: event.providerRef,
      amountCentavos: event.amountCentavos,
      occurredAt: event.occurredAt,
      rawPayload: input.rawBody,
    });

    return result;
  };
}
