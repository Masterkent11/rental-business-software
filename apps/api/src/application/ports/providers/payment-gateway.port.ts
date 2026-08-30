import type { Centavos } from '@/domain/shared/money.ts';

export interface PaymentIntent {
  readonly providerRef: string;
  readonly redirectUrl: string;
  readonly amountCentavos: Centavos;
}

export interface WebhookEvent {
  readonly eventId: string;
  readonly providerRef: string;
  readonly succeeded: boolean;
  readonly amountCentavos: Centavos;
  readonly occurredAt: Date;
}

export class WebhookVerificationError extends Error {}

export interface PaymentGateway {
  readonly provider: string;

  startPayment(input: {
    amountCentavos: Centavos;
    reference: string;
  }): Promise<PaymentIntent>;

  verifyWebhook(input: {
    rawBody: string;
    signature: string | undefined;
  }): WebhookEvent;

  refund(input: { providerRef: string; amountCentavos: Centavos }): Promise<void>;

  simulateSuccess?(input: {
    providerRef: string;
    amountCentavos: Centavos;
  }): { rawBody: string; signature: string };
}
