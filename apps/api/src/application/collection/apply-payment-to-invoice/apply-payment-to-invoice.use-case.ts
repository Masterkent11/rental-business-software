import type { InvoiceRepository } from '@/application/ports/repositories/invoice-repository.port.ts';
import type { Invoice } from '@/domain/collection/collection-state.ts';
import { assertCanApply, deriveState } from '@/domain/collection/collection-rules.ts';
import { assertMaySeeMoney } from '@/application/identity/application-authorization.rules.ts';
import type { ApplyPaymentToInvoiceInput } from './apply-payment-to-invoice.types.ts';

export class InvoiceMissingError extends Error {
  constructor(id: string) {
    super(`No invoice ${id} in this organization.`);
    this.name = 'InvoiceMissingError';
  }
}

export function applyPaymentToInvoice(invoices: InvoiceRepository) {
  return async function execute(input: ApplyPaymentToInvoiceInput): Promise<Invoice> {
    assertMaySeeMoney(input.principal, input.organizationId);

    const invoice = await invoices.findById(input.organizationId, input.invoiceId);
    if (!invoice) throw new InvoiceMissingError(input.invoiceId);

    assertCanApply({ ...invoice, state: deriveState(invoice) }, input.amountCentavos);

    return invoices.applyPayment(input);
  };
}
