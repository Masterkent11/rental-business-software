import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  WebhookVerificationError,
  type PaymentGateway,
  type PaymentIntent,
  type WebhookEvent,
} from '../../application/ports/payment-gateway.ts';
import type { Centavos } from '../../domain/shared/money.ts';

/**
 * A stand-in provider for staging, until commercial terms pick a real one.
 *
 * ADR-0008 accepted needing this. It is deliberately **not** a no-op: it signs
 * its callbacks and verifies them the way a real provider does, so the
 * idempotency and verification paths are exercised for real rather than
 * discovered on the day a provider is chosen.
 */
export function sandboxPaymentGateway(
  secret = process.env.PAYMENT_WEBHOOK_SECRET ?? 'sandbox-secret',
): PaymentGateway {
  return {
    provider: 'sandbox',

    async startPayment({ amountCentavos, reference }): Promise<PaymentIntent> {
      const providerRef = `sbx_${randomUUID()}`;
      return {
        providerRef,
        redirectUrl: `https://sandbox.invalid/pay/${providerRef}?ref=${encodeURIComponent(reference)}`,
        amountCentavos,
      };
    },

    verifyWebhook({ rawBody, signature }): WebhookEvent {
      if (!signature) {
        throw new WebhookVerificationError('Missing signature');
      }

      const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

      // Constant-time, and length-checked first because timingSafeEqual throws
      // on a length mismatch — which would itself leak the length.
      const given = Buffer.from(signature, 'utf8');
      const want = Buffer.from(expected, 'utf8');
      if (given.length !== want.length || !timingSafeEqual(given, want)) {
        throw new WebhookVerificationError('Bad signature');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        throw new WebhookVerificationError('Body is not JSON');
      }

      const body = parsed as Record<string, unknown>;
      const eventId = body.eventId;
      const providerRef = body.providerRef;
      const amount = body.amountCentavos;

      if (
        typeof eventId !== 'string' ||
        typeof providerRef !== 'string' ||
        typeof amount !== 'number' ||
        !Number.isInteger(amount)
      ) {
        throw new WebhookVerificationError('Unexpected event shape');
      }

      return {
        eventId,
        providerRef,
        succeeded: body.status === 'succeeded',
        amountCentavos: amount as Centavos,
        occurredAt:
          typeof body.occurredAt === 'string'
            ? new Date(body.occurredAt)
            : new Date(),
      };
    },

    async refund() {
      // Nothing to call. Recorded by the caller in the ledger as
      // REFUND_ISSUED, which is the part that matters for reconciliation.
    },
  };
}

/** Signs a body the way the sandbox provider would. For tests and staging. */
export function signSandboxWebhook(rawBody: string, secret = 'sandbox-secret') {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}
