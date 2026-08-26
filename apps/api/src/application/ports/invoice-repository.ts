import type { Centavos } from '../../domain/shared/money.ts';
import type { Invoice, InvoiceLineKind } from '../../domain/money/invoice.ts';
import type { PaymentOrigin } from '../../domain/money/payment.ts';

export class InvoiceNotFoundError extends Error {}
export class OccupancyNotInOrganizationError extends Error {}

/** An invoice plus the two names an owner needs to recognise it. */
export interface InvoiceWithContext extends Invoice {
  readonly tenantName: string;
  readonly resourceLabel: string;
}

/** A payment as it appears on the owner's money-in list. */
export interface CollectedPayment {
  readonly id: string;
  readonly tenantName: string;
  readonly resourceLabel: string;
  readonly amountCentavos: Centavos;
  readonly origin: PaymentOrigin;
  readonly reference: string | null;
  /** Who keyed it in, for cash. Null for anything the provider processed. */
  readonly recordedBy: string | null;
  /**
   * When the money actually moved, and when the platform learned of it. Kept
   * apart because the gap between them is the whole reason D-08 exists.
   */
  readonly receivedAt: Date | null;
  readonly recordedAt: Date;
}

/**
 * One month of an organization's money, as the owner asks about it.
 *
 * Claimed and received are returned separately and never netted: an invoice is
 * a claim and a payment is money, and the gap between the two is the question,
 * not a rounding error to tidy away.
 */
export interface CollectionMonth {
  readonly month: string;
  readonly claimedCentavos: Centavos;
  readonly receivedCentavos: Centavos;
}

export interface InvoiceRepository {
  /**
   * Every outstanding claim for an organization, with the names attached.
   *
   * Not filtered by month: rent owed since March is still owed in August, and
   * a "who owes me" list that silently drops it is worse than no list.
   */
  outstandingFor(organizationId: string): Promise<InvoiceWithContext[]>;

  /** Claimed against received, most recent month last. */
  collectionHistory(organizationId: string, months: number): Promise<CollectionMonth[]>;

  /** Payments received by an organization, most recent first. */
  recentPayments(organizationId: string, limit: number): Promise<CollectedPayment[]>;

  /** One claim, for the tenant or owner reading it. */
  findById(organizationId: string, invoiceId: string): Promise<InvoiceWithContext | null>;

  /** Every claim against one tenant, whatever organization issued it. */
  forTenant(userId: string): Promise<InvoiceWithContext[]>;

  /**
   * Raise a claim.
   *
   * The number is allocated by the database, gap-free per organization, so two
   * concurrent issues cannot both take the same one.
   */
  issue(input: {
    organizationId: string;
    occupancyId: string;
    periodStart: string;
    periodEnd: string;
    dueOn: string;
    lines: readonly { kind: InvoiceLineKind; description: string; amountCentavos: Centavos }[];
  }): Promise<Invoice>;

  /**
   * Settle part or all of a claim with money already received.
   *
   * Required to run in one transaction: write the application, let the trigger
   * re-derive `amount_paid` and state, and append the ledger entry. I-04 is a
   * check constraint, so an application that would overpay aborts the whole
   * transaction rather than leaving a half-settled invoice behind.
   */
  applyPayment(input: {
    organizationId: string;
    invoiceId: string;
    paymentId: string;
    amountCentavos: Centavos;
  }): Promise<Invoice>;
}
