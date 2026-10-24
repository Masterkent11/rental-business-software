/**
 * Pure TypeScript Domain Entity: OwnerApplication
 *
 * Rules:
 * - NO Zod
 * - NO React
 * - NO Supabase
 * - NO Zustand
 * - NO Infrastructure/HTTP imports
 */

export type ApplicationState =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED";

export interface ReservationSummary {
  readonly state: string;
  readonly feeCentavos: number;
  readonly expiresAt: string | null;
}

export interface OwnerApplication {
  readonly tenancy?: { readonly id: string; readonly kind: string; readonly state: string; readonly confirmedAt: string | null } | null;
  readonly id: string;
  readonly reference: string;
  readonly state: ApplicationState;
  readonly listingTitle: string;
  readonly propertyName: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly monthlyRentCentavos: number;
  readonly desiredMoveIn: string;
  readonly desiredTermMonths: number;
  readonly message: string;
  readonly decisionReason: string | null;
  readonly decidedAt: string | null;
  readonly createdAt: string;
  readonly holdExpiresAt: string | null;
  readonly documentCount: number;
  readonly reservation: ReservationSummary | null;
}

export type ApplicationDecision = "APPROVED" | "REJECTED" | "UNDER_REVIEW";

export interface DecisionInput {
  readonly decision: ApplicationDecision;
  readonly reason?: string;
}
