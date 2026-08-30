import type { InvoiceRepository } from '@/application/ports/repositories/invoice-repository.port.ts';
import type { Invoice } from '@/domain/collection/collection-state.ts';
import { assertMaySeeMoney } from '@/application/identity/application-authorization.rules.ts';
import type { IssueInvoiceInput } from './issue-invoice.types.ts';

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

export function issueInvoice(invoices: InvoiceRepository) {
  return async function execute(input: IssueInvoiceInput): Promise<Invoice> {
    assertMaySeeMoney(input.principal, input.organizationId);

    if (input.lines.length === 0) throw new EmptyInvoiceError();
    if (input.periodEnd <= input.periodStart) throw new InvalidPeriodError();

    return invoices.issue(input);
  };
}
