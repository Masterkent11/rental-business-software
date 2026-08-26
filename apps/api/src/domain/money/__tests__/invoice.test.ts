import { describe, expect, it } from 'vitest';
import {
  arrearsFrom,
  assertCanApply,
  balanceOf,
  daysOverdue,
  deriveState,
  InvoiceNotSettleableError,
  InvoiceOverpaidError,
  isOutstanding,
  type Invoice,
  type InvoiceState,
} from '../invoice.ts';
import { offlineShareOf } from '../../../features/collect-rent/collect-rent.ts';
import type { Centavos } from '../../shared/money.ts';
import type { CollectedPayment } from '../../../application/ports/invoice-repository.ts';

const peso = (amount: number) => (amount * 100) as Centavos;
const TODAY = new Date('2026-08-24T09:00:00Z');

const anInvoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: 'inv-1',
  organizationId: 'org-1',
  occupancyId: 'occ-1',
  tenantId: 'tenant-1',
  number: 1,
  periodStart: '2026-08-01',
  periodEnd: '2026-09-01',
  dueOn: '2026-08-05',
  totalCentavos: peso(8_500),
  amountPaidCentavos: peso(0),
  state: 'ISSUED',
  lines: [],
  ...over,
});

const withContext = (invoice: Invoice, tenantName: string, resourceLabel = 'Unit 203') => ({
  ...invoice,
  tenantName,
  resourceLabel,
});

describe('invoice state', () => {
  it('becomes overdue because the date passed, not because something touched it', () => {
    const invoice = anInvoice({ dueOn: '2026-08-05' });

    // The stored state still says ISSUED. Nothing has run since it was raised.
    expect(invoice.state).toBe('ISSUED');
    expect(deriveState(invoice, TODAY)).toBe('OVERDUE');
  });

  it('is not overdue on the due date itself', () => {
    const invoice = anInvoice({ dueOn: '2026-08-24' });
    expect(deriveState(invoice, TODAY)).toBe('ISSUED');
  });

  it('reads part payment as partly paid, whatever the due date says', () => {
    const invoice = anInvoice({ dueOn: '2026-08-05', amountPaidCentavos: peso(2_000) });
    expect(deriveState(invoice, TODAY)).toBe('PARTIALLY_PAID');
  });

  it('is paid the moment the money covers the claim', () => {
    const invoice = anInvoice({ amountPaidCentavos: peso(8_500) });
    expect(deriveState(invoice, TODAY)).toBe('PAID');
  });

  it('leaves a void and a draft exactly where they are', () => {
    for (const state of ['VOIDED', 'DRAFT'] as InvoiceState[]) {
      const invoice = anInvoice({ state, dueOn: '2020-01-01' });
      expect(deriveState(invoice, TODAY)).toBe(state);
    }
  });

  it('counts only states that are still asking for money as outstanding', () => {
    const asking: InvoiceState[] = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];
    const settled: InvoiceState[] = ['DRAFT', 'PAID', 'VOIDED'];

    for (const state of asking) expect(isOutstanding(anInvoice({ state }))).toBe(true);
    for (const state of settled) expect(isOutstanding(anInvoice({ state }))).toBe(false);
  });

  it('never reports a negative balance', () => {
    // Should be impossible via I-04, but a balance that can go negative would
    // silently subtract from the arrears total if it ever did.
    const invoice = anInvoice({ totalCentavos: peso(100), amountPaidCentavos: peso(500) });
    expect(balanceOf(invoice)).toBe(0);
  });

  it('reports days overdue as zero for a claim that is not late', () => {
    expect(daysOverdue({ dueOn: '2026-09-30' }, TODAY)).toBe(0);
    expect(daysOverdue({ dueOn: '2026-08-24' }, TODAY)).toBe(0);
    expect(daysOverdue({ dueOn: '2026-08-14' }, TODAY)).toBe(10);
  });
});

describe('I-04 — an invoice is never overpaid', () => {
  it('accepts a payment up to the exact balance', () => {
    const invoice = anInvoice({ amountPaidCentavos: peso(2_000) });
    expect(() => assertCanApply(invoice, peso(6_500))).not.toThrow();
  });

  it('refuses one centavo more than the balance', () => {
    const invoice = anInvoice({ amountPaidCentavos: peso(2_000) });
    expect(() => assertCanApply(invoice, (peso(6_500) + 1) as Centavos)).toThrow(
      InvoiceOverpaidError,
    );
  });

  it('explains the refusal in money, not in constraint names', () => {
    const invoice = anInvoice();
    try {
      assertCanApply(invoice, peso(9_000));
      throw new Error('expected a refusal');
    } catch (error) {
      expect((error as Error).message).toContain('₱8,500');
      expect((error as Error).message).toContain('credit');
    }
  });

  it('refuses to settle a claim that is not asking for anything', () => {
    for (const state of ['VOIDED', 'DRAFT', 'PAID'] as InvoiceState[]) {
      expect(() => assertCanApply(anInvoice({ state }), peso(1))).toThrow(
        InvoiceNotSettleableError,
      );
    }
  });
});

describe('arrears', () => {
  it('groups by tenant, because chasing four invoices is one phone call', () => {
    const rows = arrearsFrom(
      [
        withContext(anInvoice({ id: 'a', dueOn: '2026-08-01', totalCentavos: peso(3_000) }), 'Ana'),
        withContext(anInvoice({ id: 'b', dueOn: '2026-07-01', totalCentavos: peso(2_000) }), 'Ana'),
      ],
      TODAY,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]!.owedCentavos).toBe(peso(5_000));
    expect(rows[0]!.invoiceCount).toBe(2);
    // The oldest claim sets the age: that is how long they have been in debt.
    expect(rows[0]!.oldestDueOn).toBe('2026-07-01');
  });

  it('counts only the unpaid part of a partly settled claim', () => {
    const rows = arrearsFrom(
      [
        withContext(
          anInvoice({ totalCentavos: peso(8_500), amountPaidCentavos: peso(3_500) }),
          'Ana',
        ),
      ],
      TODAY,
    );

    expect(rows[0]!.owedCentavos).toBe(peso(5_000));
  });

  it('leaves out anything that is not asking for money', () => {
    const rows = arrearsFrom(
      [
        withContext(anInvoice({ id: 'paid', state: 'PAID' }), 'Ana'),
        withContext(anInvoice({ id: 'void', state: 'VOIDED' }), 'Ben'),
        withContext(anInvoice({ id: 'draft', state: 'DRAFT' }), 'Cy'),
      ],
      TODAY,
    );

    expect(rows).toEqual([]);
  });

  it('keeps tenants apart even when neither has an account yet', () => {
    const rows = arrearsFrom(
      [
        withContext(anInvoice({ id: 'a', tenantId: null, occupancyId: 'occ-1' }), 'Room 1'),
        withContext(anInvoice({ id: 'b', tenantId: null, occupancyId: 'occ-2' }), 'Room 2'),
      ],
      TODAY,
    );

    // Two debts, not one anonymous pile.
    expect(rows).toHaveLength(2);
  });

  it('puts the most overdue first — the list is a work queue', () => {
    const rows = arrearsFrom(
      [
        withContext(anInvoice({ id: 'a', tenantId: 't1', dueOn: '2026-08-20' }), 'Recent'),
        withContext(anInvoice({ id: 'b', tenantId: 't2', dueOn: '2026-05-01' }), 'Ancient'),
        withContext(anInvoice({ id: 'c', tenantId: 't3', dueOn: '2026-08-10' }), 'Middling'),
      ],
      TODAY,
    );

    expect(rows.map((row) => row.tenantName)).toEqual(['Ancient', 'Middling', 'Recent']);
  });
});

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
    // Three small online payments and one large cash one is mostly cash.
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
