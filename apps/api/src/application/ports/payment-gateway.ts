import type { Centavos } from '../../domain/shared/money.ts';

/**
 * A payment provider, named nowhere.
 *
 * No provider appears in the domain, the schema, or the API contract
 * (ADR-0008): provider selection depends on commercial terms nobody has agreed
 * yet, and this keeps that a late decision rather than a blocking one.
 *
 * Deliberately narrow. A wide port would fill up with one provider's
 * vocabulary and stop fitting the next.
 *
 * **Offline recordings never come through here.** There is nothing to call —
 * staff attest that cash changed hands. That is enforced by which code path
 * exists at all, not by a flag (D-09).
 */
export interface PaymentIntent {
  /** The provider's handle for this attempt. */
  readonly providerRef: string;
  /** Where to send the customer to pay. */
  readonly redirectUrl: string;
  readonly amountCentavos: Centavos;
}

export interface WebhookEvent {
  /** The provider's event id. Idempotency turns on this. */
  readonly eventId: string;
  readonly providerRef: string;
  readonly succeeded: boolean;
  readonly amountCentavos: Centavos;
  readonly occurredAt: Date;
}

export class WebhookVerificationError extends Error {}

export interface PaymentGateway {
  /** The provider's own name, for the ledger's actor column. */
  readonly provider: string;

  startPayment(input: {
    amountCentavos: Centavos;
    reference: string;
  }): Promise<PaymentIntent>;

  /**
   * Verify a callback and read it.
   *
   * Throws [WebhookVerificationError] when the signature does not check out —
   * an unverified callback is an instruction from a stranger to mark money as
   * received.
   */
  verifyWebhook(input: {
    rawBody: string;
    signature: string | undefined;
  }): WebhookEvent;

  refund(input: { providerRef: string; amountCentavos: Centavos }): Promise<void>;
}
