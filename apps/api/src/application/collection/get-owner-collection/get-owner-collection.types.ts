import type { Principal } from '@/domain/identity/identity.ts';
import type { Centavos } from '@/domain/shared/money.ts';
import type { ArrearsRow } from '@/domain/collection/collection-rules.ts';
import type {
  CollectedPayment,
  CollectionMonth,
} from '@/application/ports/repositories/invoice-repository.port.ts';

export interface GetOwnerCollectionInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly today?: Date;
}

export interface OwnerCollectionResult {
  readonly month: string;
  readonly claimedCentavos: Centavos;
  readonly receivedCentavos: Centavos;
  readonly outstandingCentavos: Centavos;
  readonly history: readonly CollectionMonth[];
  readonly arrears: readonly ArrearsRow[];
  readonly recentPayments: readonly CollectedPayment[];
  readonly offlineSharePercent: number;
}
