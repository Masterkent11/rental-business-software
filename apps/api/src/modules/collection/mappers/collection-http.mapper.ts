import type { OwnerCollectionResult } from '@/application/collection/get-owner-collection/get-owner-collection.types.ts';
import type { Invoice } from '@/domain/collection/collection.ts';

export function toCollectionHttpResponse(collection: OwnerCollectionResult) {
  return {
    month: collection.month,
    claimedCentavos: collection.claimedCentavos,
    receivedCentavos: collection.receivedCentavos,
    outstandingCentavos: collection.outstandingCentavos,
    offlineSharePercent: collection.offlineSharePercent,
    history: collection.history,
    arrears: collection.arrears.map((row) => ({
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      occupancyId: row.occupancyId,
      resourceLabel: row.resourceLabel,
      owedCentavos: row.owedCentavos,
      oldestDueOn: row.oldestDueOn,
      daysOverdue: row.daysOverdue,
      invoiceCount: row.invoiceCount,
    })),
    recentPayments: collection.recentPayments.map((payment) => ({
      id: payment.id,
      tenantName: payment.tenantName,
      resourceLabel: payment.resourceLabel,
      amountCentavos: payment.amountCentavos,
      origin: payment.origin,
      reference: payment.reference,
      recordedBy: payment.recordedBy,
      receivedAt: payment.receivedAt?.toISOString() ?? null,
      recordedAt: payment.recordedAt.toISOString(),
    })),
  };
}

export function toInvoiceHttpResponse(invoice: Invoice) {
  return {
    id: invoice.id,
    number: invoice.number,
    state: invoice.state,
    totalCentavos: invoice.totalCentavos,
    dueOn: invoice.dueOn,
  };
}

export function toAppliedInvoiceHttpResponse(invoice: Invoice) {
  return {
    id: invoice.id,
    state: invoice.state,
    totalCentavos: invoice.totalCentavos,
    amountPaidCentavos: invoice.amountPaidCentavos,
  };
}
