import { DomainError } from '@/domain/shared/domain-error.ts';
import type { Centavos } from '@/domain/shared/money.ts';
import type { InvoiceState } from './collection-state.ts';

export class InvoiceOverpaidError extends DomainError {
  constructor(balance: Centavos, attempted: Centavos) {
    super(
      `That is more than the invoice is asking for. ` +
        `${formatCentavos(attempted)} against a balance of ${formatCentavos(balance)}. ` +
        `Money beyond the total is a credit on the lease, not an overpayment.`,
    );
  }
}

export class InvoiceNotSettleableError extends DomainError {
  constructor(state: InvoiceState) {
    super(
      state === 'VOIDED'
        ? 'That invoice was voided. A voided claim cannot take a payment.'
        : state === 'DRAFT'
          ? 'That invoice has not been issued yet, so there is nothing to settle.'
          : `That invoice is already ${state.toLowerCase().replace('_', ' ')}.`,
    );
  }
}

function formatCentavos(amount: Centavos): string {
  return `₱${(amount / 100).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
}
