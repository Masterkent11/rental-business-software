import { describe, expect, it } from 'vitest';
import { offlineShareOf } from '@/application/collection/get-owner-collection/get-owner-collection.use-case.ts';
import type { CollectedPayment } from '@/application/ports/repositories/invoice-repository.port.ts';
import type { Centavos } from '@/domain/shared/money.ts';

const peso = (amount: number) => (amount * 100) as Centavos;
const TODAY = new Date('2026-08-24T09:00:00Z');

describe('the cash share', () => {
  const payment = (amount: number, origin: CollectedPayment['origin']): CollectedPayment => ({
    id: `p-${amount}-${origin}`,
    tenantName: 'Ana',
    resourceLabel: 'Unit 203',
    amountCentavos: peso(amount),
    origin,
    reference: null,
    recordedBy: null,
    receivedAt: null,
    recordedAt: TODAY,
  });

  it('is a share of money, not a share of transactions', () => {
    const share = offlineShareOf([
      payment(100, 'ONLINE'),
      payment(100, 'ONLINE'),
      payment(100, 'ONLINE'),
      payment(900, 'OFFLINE_RECORDED'),
    ]);

    expect(share).toBe(75);
  });

  it('is zero when nothing has been recorded, not a division by zero', () => {
    expect(offlineShareOf([])).toBe(0);
  });
});
