import type { InvoiceRepository } from '@/application/ports/repositories/invoice-repository.port.ts';
import type { Invoice } from '@/domain/collection/collection-state.ts';
import { assertMaySeeMoney } from '@/application/identity/application-authorization.rules.ts';
import { assertInvoicePeriod, invoiceTotalCentavos } from '@/domain/collection/collection-rules.ts';
import type { IssueInvoiceInput } from './issue-invoice.types.ts';

export function issueInvoice(invoices: InvoiceRepository) {
  return async function execute(input: IssueInvoiceInput): Promise<Invoice> {
    assertMaySeeMoney(input.principal, input.organizationId);

    invoiceTotalCentavos(input.lines);
    assertInvoicePeriod(input.periodStart, input.periodEnd);

    return invoices.issue(input);
  };
}
