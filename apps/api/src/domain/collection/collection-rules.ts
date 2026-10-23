import { isCalendarDate } from '@/domain/shared/calendar.ts';
import { centavos, type Centavos } from '@/domain/shared/money.ts';
import type { Invoice, InvoiceState } from './collection-state.ts';
import type { PaymentState } from '@/domain/payments/payment-state.ts';
import { InvoiceNotSettleableError, InvoiceOverpaidError, PaymentAllocationError, EmptyInvoiceError, InvalidPeriodError, InvalidInvoiceAmountError } from './collection-errors.ts';

/** What is still owed on this claim. Never negative. */
export function balanceOf(invoice: Pick<Invoice, 'totalCentavos' | 'amountPaidCentavos'>): Centavos {
  const balance = invoice.totalCentavos - invoice.amountPaidCentavos;
  return (balance > 0 ? balance : 0) as Centavos;
}

/** A claim that is still asking for money. */
export function isOutstanding(invoice: Pick<Invoice, 'state'>): boolean {
  return (
    invoice.state === 'ISSUED' ||
    invoice.state === 'PARTIALLY_PAID' ||
    invoice.state === 'OVERDUE'
  );
}

/**
 * I-04 — an invoice is never overpaid.
 *
 * Enforced here *and* by a database check constraint. Twice on purpose: the
 * aggregate refuses with a sentence an owner can act on, and the constraint
 * makes it true even for a write that never passed through this code.
 */
export function assertCanApply(invoice: Pick<Invoice, 'state' | 'totalCentavos' | 'amountPaidCentavos'>, amount: Centavos): void {
  if (!isOutstanding(invoice)) {
    throw new InvoiceNotSettleableError(invoice.state);
  }

  if (amount > balanceOf(invoice)) {
    throw new InvoiceOverpaidError(balanceOf(invoice), amount);
  }
}

/**
 * The state a claim is in, given what has been paid and today's date.
 *
 * Derived rather than stored in the domain so that "overdue" cannot go stale:
 * an invoice does not become overdue when something updates it, it becomes
 * overdue when the date passes.
 */
export function deriveState(
  invoice: Pick<Invoice, 'state' | 'totalCentavos' | 'amountPaidCentavos' | 'dueOn'>,
  today: Date = new Date(),
): InvoiceState {
  if (invoice.state === 'VOIDED' || invoice.state === 'DRAFT') return invoice.state;
  if (invoice.amountPaidCentavos >= invoice.totalCentavos) return 'PAID';
  if (invoice.amountPaidCentavos > 0) return 'PARTIALLY_PAID';

  const due = new Date(`${invoice.dueOn}T00:00:00Z`);
  const midnight = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  return due < midnight ? 'OVERDUE' : 'ISSUED';
}

/** Whole days a claim is past its due date. Zero when it is not. */
export function daysOverdue(invoice: Pick<Invoice, 'dueOn'>, today: Date = new Date()): number {
  const due = Date.parse(`${invoice.dueOn}T00:00:00Z`);
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const days = Math.floor((midnight - due) / 86_400_000);
  return days > 0 ? days : 0;
}

/**
 * What the owner is chasing, one row per tenant.
 */
export interface ArrearsRow {
  readonly tenantId: string | null;
  readonly tenantName: string;
  readonly occupancyId: string;
  readonly resourceLabel: string;
  readonly owedCentavos: Centavos;
  readonly oldestDueOn: string;
  readonly daysOverdue: number;
  readonly invoiceCount: number;
}

export function arrearsFrom(
  invoices: readonly (Invoice & { tenantName: string; resourceLabel: string })[],
  today: Date = new Date(),
): ArrearsRow[] {
  const byTenant = new Map<string, ArrearsRow>();

  for (const invoice of invoices) {
    if (!isOutstanding(invoice)) continue;

    const key = invoice.tenantId ?? `occupancy:${invoice.occupancyId}`;
    const existing = byTenant.get(key);
    const owed = balanceOf(invoice);

    if (!existing) {
      byTenant.set(key, {
        tenantId: invoice.tenantId,
        tenantName: invoice.tenantName,
        occupancyId: invoice.occupancyId,
        resourceLabel: invoice.resourceLabel,
        owedCentavos: owed,
        oldestDueOn: invoice.dueOn,
        daysOverdue: daysOverdue(invoice, today),
        invoiceCount: 1,
      });
      continue;
    }

    const older = invoice.dueOn < existing.oldestDueOn;
    byTenant.set(key, {
      ...existing,
      owedCentavos: centavos(existing.owedCentavos + owed),
      oldestDueOn: older ? invoice.dueOn : existing.oldestDueOn,
      daysOverdue: Math.max(existing.daysOverdue, daysOverdue(invoice, today)),
      invoiceCount: existing.invoiceCount + 1,
    });
  }

  return [...byTenant.values()].sort(
    (a, b) => b.daysOverdue - a.daysOverdue || b.owedCentavos - a.owedCentavos,
  );
}

export function assertPaymentCanCover(
  payment: { state: PaymentState; amountCentavos: Centavos; allocatedCentavos: Centavos },
  amount: Centavos,
): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new PaymentAllocationError('An allocation must be a positive whole-centavo amount.');
  }
  if (payment.state !== 'SUCCEEDED') {
    throw new PaymentAllocationError('Only settled payments can be allocated.');
  }
  if (amount > payment.amountCentavos - payment.allocatedCentavos) {
    throw new PaymentAllocationError('That is more than the payment has left to allocate.');
  }
}

export function invoiceTotalCentavos(lines: readonly { amountCentavos: Centavos }[]): Centavos {
  if (lines.length === 0) throw new EmptyInvoiceError();
  try {
    return centavos(lines.reduce((sum, line) => sum + centavos(line.amountCentavos), 0));
  } catch (error) {
    if (error instanceof RangeError) {
      throw new InvalidInvoiceAmountError('The invoice total is too large or contains an invalid amount.');
    }
    throw error;
  }
}

export function assertInvoicePeriod(periodStart: string, periodEnd: string): void {
  if (!isCalendarDate(periodStart) || !isCalendarDate(periodEnd) || periodEnd <= periodStart) throw new InvalidPeriodError();
}
