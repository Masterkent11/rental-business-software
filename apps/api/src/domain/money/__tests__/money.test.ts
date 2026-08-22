import { describe, expect, it } from 'vitest';
import { stayTotalCentavos } from '../payment.ts';
import { isReconcilable, type LedgerEntry } from '../ledger.ts';
import { centavos } from '../../shared/money.ts';

describe('stayTotalCentavos', () => {
  it('multiplies in integer centavos', () => {
    // ₱450/night × 3 = ₱1,350. Exact, and it must stay exact.
    expect(stayTotalCentavos(centavos(45_000), 3)).toBe(135_000);
  });

  it('never produces a fraction', () => {
    const total = stayTotalCentavos(centavos(33_333), 7);
    expect(Number.isInteger(total)).toBe(true);
  });

  it('refuses a zero-night stay', () => {
    expect(() => stayTotalCentavos(centavos(45_000), 0)).toThrow();
  });
});

describe('isReconcilable', () => {
  const entry = (origin: LedgerEntry['origin']): LedgerEntry => ({
    id: 'l-1',
    organizationId: 'org-1',
    entryType: 'PAYMENT_RECEIVED',
    amountCentavos: centavos(45_000),
    origin,
    actorType: origin === 'ONLINE' ? 'PROVIDER' : 'STAFF',
    actorId: 'x',
    causeType: 'PAYMENT',
    causeId: 'p-1',
    correctsId: null,
    occurredAt: new Date(),
    recordedAt: new Date(),
  });

  it('counts an online entry', () => {
    expect(isReconcilable(entry('ONLINE'))).toBe(true);
  });

  it('excludes an offline recording', () => {
    // Offline entries have no provider side. Including them produces a
    // reconciliation that never balances, and one that never balances is one
    // nobody reads.
    expect(isReconcilable(entry('OFFLINE_RECORDED'))).toBe(false);
  });
});
