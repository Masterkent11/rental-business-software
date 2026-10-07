import {
  PaymentProviderUnavailableError,
  WebhookVerificationError,
  type PaymentGateway,
} from '@/application/ports/providers/payment-gateway.port.ts';

export function unavailablePaymentGateway(): PaymentGateway {
  return {
    provider: 'none',
    async startPayment() {
      throw new PaymentProviderUnavailableError(
        'Online payment is not available yet. Your dates were not charged.',
      );
    },
    verifyWebhook() {
      throw new WebhookVerificationError('No payment provider is configured');
    },
    async refund() {
      throw new PaymentProviderUnavailableError('No payment provider is configured');
    },
  };
}
