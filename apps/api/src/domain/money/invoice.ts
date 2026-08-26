import type { Centavos } from '../shared/money.ts';

/**
 * A claim by an Organization against a Tenant, for a period, with a due date.
 *
 * An invoice is not money. It is the assertion that money is owed, and it is
 * kept separate from the payment that settles it because the two disagree
 * constantly — that disagreement is the entire subject of the owner's month.
 *
 * **Long-term only.** A prepaid Stay raises no invoice: the booking is paid
 * before it exists, so a claim would be issued and settled in the same
 * instant and tell nobody anything.
 */
export type InvoiceState =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOIDED';

/**
 * What a line is for.
 *
 * `DEPOSIT` appears here and is still not revenue — the line raises the claim,
 * the Deposit Balance holds the money. Collapsing the two is the mistake
 * money-model.md spends a section refusing.
 */
export type InvoiceLineKind =
  | 'RENT'
  | 'ADVANCE'
  | 'DEPOSIT'
  | 'UTILITY'
  | 'PENALTY'
  | 'OTHER';

export interface InvoiceLine {
  readonly kind: InvoiceLineKind;
  readonly description: string;
  readonly amountCentavos: Centavos;
}

export interface Invoice {
  readonly id: string;
  readonly organizationId: string;
  readonly occupancyId: string;
  readonly tenantId: string | null;
  /** Per-organization and gap-free. Accountants ask about gaps. */
  readonly number: number;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly dueOn: string;
  readonly totalCentavos: Centavos;
  readonly amountPaidCentavos: Centavos;
  readonly state: InvoiceState;
  readonly lines: readonly InvoiceLine[];
}

export class InvoiceOverpaidError extends Error {
  constructor(balance: Centavos, attempted: Centavos) {
    super(
      `That is more than the invoice is asking for. ` +
        `${formatCentavos(attempted)} against a balance of ${formatCentavos(balance)}. ` +
        `Money beyond the total is a credit on the lease, not an overpayment.`,
    );
    this.name = 'InvoiceOverpaidError';
  }
}

export class InvoiceNotSettleableError extends Error {
  constructor(state: InvoiceState) {
    super(
      state === 'VOIDED'
        ? 'That invoice was voided. A voided claim cannot take a payment.'
        : state === 'DRAFT'
          ? 'That invoice has not been issued yet, so there is nothing to settle.'
          : `That invoice is already ${state.toLowerCase().replace('_', ' ')}.`,
    );
    this.name = 'InvoiceNotSettleableError';
  }
}

/** What is still owed on this claim. Never negative. */
export function balanceOf(invoice: Invoice): Centavos {
  const balance = invoice.totalCentavos - invoice.amountPaidCentavos;
  return (balance > 0 ? balance : 0) as Centavos;
}

/** A claim that is still asking for money. */
export function isOutstanding(invoice: Invoice): boolean {
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
export function assertCanApply(invoice: Invoice, amount: Centavos): void {
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
 *
 * Grouped by tenant rather than by invoice because the question is "who owes
 * me money", not "which claims are open" — an owner chasing four invoices from
 * one person makes one phone call, not four.
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

    // An invoice with no tenant account yet is still owed by someone; keying
    // on the occupancy keeps it visible rather than merging every such claim
    // into one anonymous row.
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
      owedCentavos: (existing.owedCentavos + owed) as Centavos,
      oldestDueOn: older ? invoice.dueOn : existing.oldestDueOn,
      daysOverdue: Math.max(existing.daysOverdue, daysOverdue(invoice, today)),
      invoiceCount: existing.invoiceCount + 1,
    });
  }

  // Most overdue first: the list is a work queue, not a directory.
  return [...byTenant.values()].sort(
    (a, b) => b.daysOverdue - a.daysOverdue || b.owedCentavos - a.owedCentavos,
  );
}

function formatCentavos(amount: Centavos): string {
  return `₱${(amount / 100).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
}
