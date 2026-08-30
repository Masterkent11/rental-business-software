import type { Centavos } from '@/domain/shared/money.ts';

export type InvoiceState =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOIDED';

export type InvoiceLineKind =
  | 'RENT'
  | 'ADVANCE'
  | 'DEPOSIT'
  | 'UTILITY'
  | 'PENALTY'
  | 'OTHER';

export interface InvoiceLine {
  readonly kind: InvoiceLineKind;
  readonly description: string;
  readonly amountCentavos: Centavos;
}

export interface Invoice {
  readonly id: string;
  readonly organizationId: string;
  readonly occupancyId: string;
  readonly tenantId: string | null;
  readonly number: number;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly dueOn: string;
  readonly totalCentavos: Centavos;
  readonly amountPaidCentavos: Centavos;
  readonly state: InvoiceState;
  readonly lines: readonly InvoiceLine[];
}
