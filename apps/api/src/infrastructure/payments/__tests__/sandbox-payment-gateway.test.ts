import { unavailablePaymentGateway } from '@/infrastructure/payments/unavailable-payment-gateway.adapter.ts';
import { PaymentProviderUnavailableError } from '@/application/ports/providers/payment-gateway.port.ts';
import { describe, expect, it } from 'vitest';
import { sandboxPaymentGateway, signSandboxWebhook } from '@/infrastructure/payments/sandbox-payment-gateway.adapter.ts';
import { WebhookVerificationError } from '@/application/ports/providers/payment-gateway.port.ts';

const gateway = sandboxPaymentGateway('test-secret');

const body = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    eventId: 'evt_1',
    providerRef: 'sbx_1',
    amountCentavos: 90000,
    status: 'succeeded',
    occurredAt: '2026-08-22T01:00:00.000Z',
    ...over,
  });

describe('webhook verification', () => {
  it('accepts a correctly signed event', () => {
    const raw = body();
    const event = gateway.verifyWebhook({
      rawBody: raw,
      signature: signSandboxWebhook(raw, 'test-secret'),
    });

    expect(event.eventId).toBe('evt_1');
    expect(event.succeeded).toBe(true);
    expect(event.amountCentavos).toBe(90000);
  });

  it('refuses an unsigned callback', () => {
    // An unverified callback is an instruction from a stranger to mark money
    // as received.
    expect(() =>
      gateway.verifyWebhook({ rawBody: body(), signature: undefined }),
    ).toThrow(WebhookVerificationError);
  });

  it('refuses a wrong signature', () => {
    expect(() =>
      gateway.verifyWebhook({ rawBody: body(), signature: 'a'.repeat(64) }),
    ).toThrow(WebhookVerificationError);
  });

  it('refuses a signature made with a different secret', () => {
    const raw = body();
    expect(() =>
      gateway.verifyWebhook({
        rawBody: raw,
        signature: signSandboxWebhook(raw, 'not-the-secret'),
      }),
    ).toThrow(WebhookVerificationError);
  });

  it('refuses a body altered after signing', () => {
    // The signature is over bytes. Changing the amount must invalidate it —
    // otherwise the amount is a suggestion.
    const raw = body();
    const signature = signSandboxWebhook(raw, 'test-secret');
    const tampered = body({ amountCentavos: 1 });

    expect(() =>
      gateway.verifyWebhook({ rawBody: tampered, signature }),
    ).toThrow(WebhookVerificationError);
  });

  it('refuses an event missing its id', () => {
    const raw = body({ eventId: undefined });
    expect(() =>
      gateway.verifyWebhook({
        rawBody: raw,
        signature: signSandboxWebhook(raw, 'test-secret'),
      }),
    ).toThrow(WebhookVerificationError);
  });

  it('refuses a non-integer amount', () => {
    // No floating point may touch an amount, at any layer.
    const raw = body({ amountCentavos: 900.5 });
    expect(() =>
      gateway.verifyWebhook({
        rawBody: raw,
        signature: signSandboxWebhook(raw, 'test-secret'),
      }),
    ).toThrow(WebhookVerificationError);
  });

  it('reads a failed attempt as failed rather than throwing', () => {
    const raw = body({ status: 'failed' });
    const event = gateway.verifyWebhook({
      rawBody: raw,
      signature: signSandboxWebhook(raw, 'test-secret'),
    });

    expect(event.succeeded).toBe(false);
  });
});

describe('starting a payment', () => {
  it('returns a provider reference and somewhere to send the customer', async () => {
    const intent = await gateway.startPayment({
      amountCentavos: 90000 as never,
      reference: 'occ-1',
    });

    expect(intent.providerRef).toMatch(/^sbx_/);
    expect(intent.redirectUrl).toContain(intent.providerRef);
    expect(intent.amountCentavos).toBe(90000);
  });

  it('never reuses a reference', async () => {
    const a = await gateway.startPayment({ amountCentavos: 1 as never, reference: 'x' });
    const b = await gateway.startPayment({ amountCentavos: 1 as never, reference: 'x' });

    expect(a.providerRef).not.toBe(b.providerRef);
  });
});

describe('malformed signed event contracts', () => {
  it.each(['null', '[]', 'true', '42'])('rejects non-object event %s with a verification error', rawBody => {
    expect(() => gateway.verifyWebhook({ rawBody, signature: signSandboxWebhook(rawBody, 'test-secret') })).toThrow(WebhookVerificationError);
  });
  it.each([{amountCentavos:-1},{amountCentavos:Number.MAX_SAFE_INTEGER+1},{occurredAt:'not-a-date'},{eventId:''},{providerRef:''}])('rejects invalid event fields %j', changes => {
    const rawBody = body(changes);
    expect(() => gateway.verifyWebhook({rawBody,signature:signSandboxWebhook(rawBody,'test-secret')})).toThrow(WebhookVerificationError);
  });
});

describe('unavailable provider contract', () => {
  const unavailable = unavailablePaymentGateway();
  it('rejects starting a payment instead of fabricating an intent', async () => {
    await expect(unavailable.startPayment({amountCentavos:100 as never,reference:'hold'})).rejects.toBeInstanceOf(PaymentProviderUnavailableError);
  });
  it('rejects refunds instead of claiming success', async () => {
    await expect(unavailable.refund({amountCentavos:100 as never,providerRef:'payment'})).rejects.toBeInstanceOf(PaymentProviderUnavailableError);
  });
  it('rejects callbacks and exposes no simulation capability', () => {
    expect(()=>unavailable.verifyWebhook({rawBody:'{}',signature:undefined})).toThrow(WebhookVerificationError);
    expect(unavailable.simulateSuccess).toBeUndefined();
  });
});
