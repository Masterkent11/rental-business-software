import type { Centavos } from '@/domain/shared/money.ts';
import type { PaymentOrigin, PaymentState } from './payment-state.ts';

export * from './payment-state.ts';
export * from './payment-rules.ts';
export * from './payment-errors.ts';

export interface Payment {
  readonly id: string;
  readonly organizationId: string;
  readonly occupancyId: string;
  readonly amountCentavos: Centavos;
  readonly origin: PaymentOrigin;
  readonly state: PaymentState;
  readonly providerRef: string | null;
  /** When the money arrived. */
  readonly receivedAt: Date | null;
  /** When the platform learned of it. The gap is what audit looks at. */
  readonly recordedAt: Date;
}
