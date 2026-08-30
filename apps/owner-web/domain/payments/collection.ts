/**
 * Pure TypeScript Domain Entity: Collection & Arrears & Payment
 *
 * Rules:
 * - NO Zod
 * - NO React
 * - NO Supabase
 * - NO Zustand
 * - NO Infrastructure/HTTP imports
 */

export type PaymentOrigin = "ONLINE" | "OFFLINE_RECORDED";

export interface ArrearsRecord {
  readonly tenantId: string | null;
  readonly tenantName: string;
  readonly occupancyId: string;
  readonly resourceLabel: string;
  readonly owedCentavos: number;
  readonly oldestDueOn: string;
  readonly daysOverdue: number;
  readonly invoiceCount: number;
}

export interface RecentPayment {
  readonly id: string;
  readonly tenantName: string;
  readonly resourceLabel: string;
  readonly amountCentavos: number;
  readonly origin: PaymentOrigin;
  readonly reference: string | null;
  readonly recordedBy: string | null;
  readonly receivedAt: string | null;
  readonly recordedAt: string;
}

export interface MonthlyCollectionHistory {
  readonly month: string;
  readonly claimedCentavos: number;
  readonly receivedCentavos: number;
}

export interface Collection {
  readonly month: string;
  readonly claimedCentavos: number;
  readonly receivedCentavos: number;
  readonly outstandingCentavos: number;
  readonly offlineSharePercent: number;
  readonly history: readonly MonthlyCollectionHistory[];
  readonly arrears: readonly ArrearsRecord[];
  readonly recentPayments: readonly RecentPayment[];
}
