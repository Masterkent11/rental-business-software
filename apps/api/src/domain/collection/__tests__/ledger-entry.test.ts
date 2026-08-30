import { describe, expect, it } from 'vitest';
import { isReconcilable, type LedgerEntry } from '@/domain/collection/ledger-entry.ts';
import { centavos } from '@/domain/shared/money.ts';

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
