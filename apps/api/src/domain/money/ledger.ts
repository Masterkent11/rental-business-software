import type { Centavos } from '../shared/money.ts';
import type { PaymentOrigin } from './payment.ts';

/**
 * The append-only record of what happened.
 *
 * Not an accounting system — a permanent non-goal. It records rental money
 * movements, produces no statutory statements, and is not double-entry
 * bookkeeping.
 */
export type LedgerEntryType =
  | 'INVOICE_ISSUED'
  | 'INVOICE_VOIDED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_CORRECTED'
  | 'REFUND_ISSUED'
  | 'DEPOSIT_HELD'
  | 'DEPOSIT_APPLIED'
  | 'DEPOSIT_RETURNED'
  | 'BOOKING_PREPAID';

/** Who says so. A column, not an inference. */
export type ActorType = 'PROVIDER' | 'STAFF' | 'SYSTEM';

/** What this entry descends from. Every entry names its cause. */
export type CauseType = 'PAYMENT' | 'INVOICE' | 'BOOKING' | 'DEPOSIT_BALANCE';

export interface LedgerEntry {
  readonly id: string;
  readonly organizationId: string;
  readonly entryType: LedgerEntryType;
  /**
   * Never negative. Direction is expressed by entry type, not by sign — a
   * refund is a REFUND_ISSUED entry, not a negative payment.
   */
  readonly amountCentavos: Centavos;
  readonly origin: PaymentOrigin;
  readonly actorType: ActorType;
  readonly actorId: string | null;
  readonly causeType: CauseType;
  readonly causeId: string;
  /** Set only on a correction, naming the entry it opposes. */
  readonly correctsId: string | null;
  readonly occurredAt: Date;
  readonly recordedAt: Date;
}

/**
 * Only ONLINE entries can be reconciled.
 *
 * Offline recordings have no provider side to compare against. Including them
 * would produce a reconciliation that never balances — and a reconciliation
 * that never balances is one nobody reads.
 */
export function isReconcilable(entry: LedgerEntry): boolean {
  return entry.origin === 'ONLINE';
}
