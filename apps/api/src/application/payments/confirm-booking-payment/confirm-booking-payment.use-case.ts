import type { PaymentGateway } from '@/application/ports/providers/payment-gateway.port.ts';
import type {
  ConfirmationResult,
  PaymentRepository,
} from '@/application/ports/repositories/payment-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { NewNotification } from '@/domain/notifications/notification.ts';
import type { ConfirmBookingPaymentInput } from './confirm-booking-payment.types.ts';

export function confirmBookingPayment(
  payments: PaymentRepository,
  gateway: PaymentGateway,
  notifications?: NotificationRepository,
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

    const stay = result.stay;
    if (notifications && result.applied && stay) {
      const when = `${stay.startsOn} to ${stay.endsOn}`;
      const outgoing: NewNotification[] = [
        {
          audience: { organizationId: stay.organizationId },
          kind: 'BOOKING_RECEIVED',
          title: 'New booking confirmed',
          body: `${stay.listingTitle} · ${when}`,
          link: `/bookings?b=${result.payment.occupancyId}`,
        },
      ];
      if (stay.guestId) {
        outgoing.push({
          audience: { userId: stay.guestId },
          kind: 'BOOKING_CONFIRMED',
          title: 'Your booking is confirmed',
          body: `${stay.listingTitle} · ${when}`,
          link: `/bookings/${result.payment.occupancyId}`,
        });
      }
      await notifications.publish(outgoing);
    }

    return result;
  };
}
