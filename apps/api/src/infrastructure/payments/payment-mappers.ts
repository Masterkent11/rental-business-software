import type { Payment, PaymentOrigin, PaymentState } from '@/domain/payments/payment.ts';
import type { Centavos } from '@/domain/shared/money.ts';

export interface PaymentRow {
  readonly id: string;
  readonly organization_id: string;
  readonly occupancy_id: string;
  readonly amount_centavos: number;
  readonly origin: string;
  readonly state: string;
  readonly provider_ref: string | null;
  readonly received_at: string | Date | null;
  readonly recorded_at: string | Date;
}

export function mapPaymentRow(row: PaymentRow): Payment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    occupancyId: row.occupancy_id,
    amountCentavos: row.amount_centavos as Centavos,
    origin: row.origin as PaymentOrigin,
    state: row.state as PaymentState,
    providerRef: row.provider_ref,
    receivedAt: row.received_at ? new Date(row.received_at) : null,
    recordedAt: new Date(row.recorded_at),
  };
}
