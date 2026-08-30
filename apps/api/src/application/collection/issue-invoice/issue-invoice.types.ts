import type { Principal } from '@/domain/identity/identity.ts';
import type { InvoiceLineKind } from '@/domain/collection/collection-state.ts';
import type { Centavos } from '@/domain/shared/money.ts';

export interface IssueInvoiceLineInput {
  readonly kind: InvoiceLineKind;
  readonly description: string;
  readonly amountCentavos: Centavos;
}

export interface IssueInvoiceInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly occupancyId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly dueOn: string;
  readonly lines: readonly IssueInvoiceLineInput[];
}
