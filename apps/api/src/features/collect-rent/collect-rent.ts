import type {
  CollectedPayment,
  CollectionMonth,
  InvoiceRepository,
} from '../../application/ports/invoice-repository.ts';
import {
  arrearsFrom,
  assertCanApply,
  balanceOf,
  deriveState,
  isOutstanding,
  type ArrearsRow,
  type Invoice,
  type InvoiceLineKind,
} from '../../domain/money/invoice.ts';
import type { Centavos } from '../../domain/shared/money.ts';

/**
 * What the owner dashboard is actually asking.
 *
 * The pilot is judged on one sentence — *"an owner answers 'who owes me money
 * this month?' from the platform alone"* — and this is the shape of that
 * answer: what was claimed, what arrived, what is still out, and from whom.
 */
export interface Collection {
  readonly month: string;
  readonly claimedCentavos: Centavos;
  readonly receivedCentavos: Centavos;
  /**
   * Everything still owed, not just this month's share. Rent unpaid since
   * March is still owed in August, and a total that quietly drops it tells the
   * owner they are doing better than they are.
   */
  readonly outstandingCentavos: Centavos;
  readonly history: readonly CollectionMonth[];
  readonly arrears: readonly ArrearsRow[];
  readonly recentPayments: readonly CollectedPayment[];
  /**
   * Share of recent money that staff keyed in rather than the platform
   * processing it. The number D-08 exists to keep visible.
   */
  readonly offlineSharePercent: number;
}

const MONTHS_OF_HISTORY = 6;
const RECENT_PAYMENT_LIMIT = 12;

/**
 * Read one organization's month.
 *
 * Authorization is the caller's job — this runs after the controller has
 * established that the principal holds OWNER or STAFF *at this organization*.
 */
export function ownerCollection(invoices: InvoiceRepository) {
  return async function read(
    organizationId: string,
    today: Date = new Date(),
  ): Promise<Collection> {
    const [outstanding, history, recentPayments] = await Promise.all([
      invoices.outstandingFor(organizationId),
      invoices.collectionHistory(organizationId, MONTHS_OF_HISTORY),
      invoices.recentPayments(organizationId, RECENT_PAYMENT_LIMIT),
    ]);

    const month = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;
    const thisMonth = history.find((row) => row.month === month);

    // Recomputed here rather than trusted from the row: `state` is written when
    // something touches the invoice, but an invoice becomes overdue when the
    // date passes and nothing touches it at all.
    const live = outstanding
      .map((invoice) => ({ ...invoice, state: deriveState(invoice, today) }))
      .filter(isOutstanding);

    const outstandingCentavos = live.reduce(
      (sum, invoice) => sum + balanceOf(invoice),
      0,
    ) as Centavos;

    return {
      month,
      claimedCentavos: thisMonth?.claimedCentavos ?? (0 as Centavos),
      receivedCentavos: thisMonth?.receivedCentavos ?? (0 as Centavos),
      outstandingCentavos,
      history,
      arrears: arrearsFrom(live, today),
      recentPayments,
      offlineSharePercent: offlineShareOf(recentPayments),
    };
  };
}

/**
 * How much of the recent money never touched the platform.
 *
 * Zero payments is 0%, not a division by zero and not "no data" — an owner
 * with nothing recorded has no cash problem yet.
 */
export function offlineShareOf(payments: readonly CollectedPayment[]): number {
  const total = payments.reduce((sum, p) => sum + p.amountCentavos, 0);
  if (total === 0) return 0;

  const offline = payments
    .filter((p) => p.origin === 'OFFLINE_RECORDED')
    .reduce((sum, p) => sum + p.amountCentavos, 0);

  return Math.round((offline / total) * 100);
}

export class EmptyInvoiceError extends Error {
  constructor() {
    super('An invoice needs at least one line. A claim for nothing is not a claim.');
    this.name = 'EmptyInvoiceError';
  }
}

export class InvalidPeriodError extends Error {
  constructor() {
    super('The invoice period must end after it starts.');
    this.name = 'InvalidPeriodError';
  }
}

/** Raise a claim against an occupancy. */
export function issueInvoice(invoices: InvoiceRepository) {
  return async function issue(input: {
    organizationId: string;
    occupancyId: string;
    periodStart: string;
    periodEnd: string;
    dueOn: string;
    lines: readonly { kind: InvoiceLineKind; description: string; amountCentavos: Centavos }[];
  }): Promise<Invoice> {
    if (input.lines.length === 0) throw new EmptyInvoiceError();
    if (input.periodEnd <= input.periodStart) throw new InvalidPeriodError();

    return invoices.issue(input);
  };
}

/**
 * Settle a claim with money already received.
 *
 * I-04 is checked here against the invoice as read, and again by the database
 * as the row is written. The first gives the owner a sentence they can act on;
 * the second is what makes the invariant true regardless of this code.
 */
export function applyPaymentToInvoice(invoices: InvoiceRepository) {
  return async function apply(input: {
    organizationId: string;
    invoiceId: string;
    paymentId: string;
    amountCentavos: Centavos;
  }): Promise<Invoice> {
    const invoice = await invoices.findById(input.organizationId, input.invoiceId);
    if (!invoice) return Promise.reject(new InvoiceMissingError(input.invoiceId));

    assertCanApply({ ...invoice, state: deriveState(invoice) }, input.amountCentavos);

    return invoices.applyPayment(input);
  };
}

export class InvoiceMissingError extends Error {
  constructor(id: string) {
    super(`No invoice ${id} in this organization.`);
    this.name = 'InvoiceMissingError';
  }
}
