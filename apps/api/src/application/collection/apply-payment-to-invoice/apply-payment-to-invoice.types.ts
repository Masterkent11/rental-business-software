import type { Principal } from '@/domain/identity/identity.ts';
import type { Centavos } from '@/domain/shared/money.ts';

export interface ApplyPaymentToInvoiceInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly invoiceId: string;
  readonly paymentId: string;
  readonly amountCentavos: Centavos;
}
