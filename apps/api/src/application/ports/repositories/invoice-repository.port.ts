import type { Centavos } from '@/domain/shared/money.ts';
import type { Invoice, InvoiceLineKind } from '@/domain/collection/collection-state.ts';
import type { PaymentOrigin } from '@/domain/payments/payment.ts';

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
  readonly recordedBy: string | null;
  readonly receivedAt: Date | null;
  readonly recordedAt: Date;
}

export interface CollectionMonth {
  readonly month: string;
  readonly claimedCentavos: Centavos;
  readonly receivedCentavos: Centavos;
}

export interface InvoiceRepository {
  outstandingFor(organizationId: string): Promise<InvoiceWithContext[]>;
  collectionHistory(organizationId: string, months: number): Promise<CollectionMonth[]>;
  recentPayments(organizationId: string, limit: number): Promise<CollectedPayment[]>;
  findById(organizationId: string, invoiceId: string): Promise<InvoiceWithContext | null>;
  forTenant(userId: string): Promise<InvoiceWithContext[]>;
  issue(input: {
    organizationId: string;
    occupancyId: string;
    periodStart: string;
    periodEnd: string;
    dueOn: string;
    lines: readonly { kind: InvoiceLineKind; description: string; amountCentavos: Centavos }[];
  }): Promise<Invoice>;
  applyPayment(input: {
    organizationId: string;
    invoiceId: string;
    paymentId: string;
    amountCentavos: Centavos;
  }): Promise<Invoice>;
}
