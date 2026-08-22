import type { Centavos } from '../../domain/shared/money.ts';
import type { Payment } from '../../domain/money/payment.ts';

export class BookingNotHeldError extends Error {}
export class AmountMismatchError extends Error {}

export interface BookingForPayment {
  readonly occupancyId: string;
  readonly organizationId: string;
  readonly amountCentavos: Centavos;
  readonly nights: number;
}

export interface ConfirmationResult {
  readonly payment: Payment;
  readonly stayId: string;
  /** False when the event had already been applied. */
  readonly applied: boolean;
}

export interface PaymentRepository {
  /** The live hold and what it costs. Null when there is no payable hold. */
  findPayableBooking(occupancyId: string): Promise<BookingForPayment | null>;

  /** Record a PENDING online payment against the hold. */
  startPayment(input: {
    occupancyId: string;
    amountCentavos: Centavos;
    providerRef: string;
  }): Promise<Payment>;

  /**
   * Apply a provider confirmation, **once**.
   *
   * Required to run in one transaction: claim the provider event id, mark the
   * payment succeeded, promote the hold to COMMITTED, create the stay, and
   * append the ledger entry. A replayed event returns `applied: false` and
   * changes nothing.
   */
  confirmPayment(input: {
    providerEventId: string;
    provider: string;
    providerRef: string;
    amountCentavos: Centavos;
    occurredAt: Date;
    rawPayload: string;
  }): Promise<ConfirmationResult>;
}
