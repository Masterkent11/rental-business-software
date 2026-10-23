import type {
  CollectedPayment,
  InvoiceRepository,
} from '@/application/ports/repositories/invoice-repository.port.ts';
import {
  arrearsFrom,
  balanceOf,
  deriveState,
  isOutstanding,
} from '@/domain/collection/collection-rules.ts';
import { centavos, type Centavos } from '@/domain/shared/money.ts';
import { assertMaySeeMoney } from '@/application/identity/application-authorization.rules.ts';
import type {
  GetOwnerCollectionInput,
  OwnerCollectionResult,
} from './get-owner-collection.types.ts';

const MONTHS_OF_HISTORY = 6;
const RECENT_PAYMENT_LIMIT = 12;

export function getOwnerCollection(invoices: InvoiceRepository) {
  return async function execute(
    input: GetOwnerCollectionInput,
  ): Promise<OwnerCollectionResult> {
    assertMaySeeMoney(input.principal, input.organizationId);

    const today = input.today ?? new Date();

    const [outstanding, history, recentPayments] = await Promise.all([
      invoices.outstandingFor(input.organizationId),
      invoices.collectionHistory(input.organizationId, MONTHS_OF_HISTORY),
      invoices.recentPayments(input.organizationId, RECENT_PAYMENT_LIMIT),
    ]);

    const month = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;
    const thisMonth = history.find((row) => row.month === month);

    const live = outstanding
      .map((invoice) => ({ ...invoice, state: deriveState(invoice, today) }))
      .filter(isOutstanding);

    const outstandingCentavos = centavos(live.reduce(
      (sum, invoice) => sum + balanceOf(invoice),
      0,
    ));

    return {
      month,
      claimedCentavos: thisMonth?.claimedCentavos ?? (0 as Centavos),
      receivedCentavos: thisMonth?.receivedCentavos ?? (0 as Centavos),
      outstandingCentavos,
      history,
      arrears: arrearsFrom(live, today),
      recentPayments,
      offlineSharePercent: offlineShareOf(recentPayments),
    };
  };
}

export function offlineShareOf(payments: readonly CollectedPayment[]): number {
  const total = centavos(payments.reduce((sum, p) => sum + p.amountCentavos, 0));
  if (total === 0) return 0;

  const offline = payments
    .filter((p) => p.origin === 'OFFLINE_RECORDED')
    .reduce((sum, p) => sum + p.amountCentavos, 0);

  return Math.round((offline / total) * 100);
}
