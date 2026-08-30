import type { Centavos } from '@/domain/shared/money.ts';
import type { ReservationState } from './reservation-state.ts';

export * from './reservation-state.ts';

export interface Reservation {
  readonly id: string;
  readonly organizationId: string;
  readonly applicationId: string;
  readonly occupancyId: string | null;
  readonly feeCentavos: Centavos;
  readonly state: ReservationState;
  readonly expiresAt: Date | null;
}

/**
 * What happens to the fee, and why.
 *
 * Three outcomes, each a different promise:
 *
 *   - **Credited** on approval — the money is already paid toward the lease.
 *     Not a refund and not the owner's revenue: a claim the tenant holds
 *     against their first invoice.
 *   - **Refunded** on rejection — the owner said no, so the money goes back.
 *     The customer did nothing wrong and must not be out of pocket.
 *   - **Forfeited** on withdrawal — the customer changed their mind after the
 *     resource was held off the market for them. The owner carried that cost.
 *
 * Deriving these from the application's state would be wrong: "approved" and
 * "the fee was credited" can be true at different moments, and the second is
 * the one the customer is owed an answer about.
 */
export type FeeOutcome = 'CREDITED' | 'REFUNDED' | 'FORFEITED';

export function outcomeFor(
  decision: 'APPROVED' | 'REJECTED' | 'WITHDRAWN',
): FeeOutcome {
  switch (decision) {
    case 'APPROVED':
      return 'CREDITED';
    case 'REJECTED':
      return 'REFUNDED';
    case 'WITHDRAWN':
      return 'FORFEITED';
  }
}

/** The ledger entry each outcome raises. */
export function ledgerTypeFor(outcome: FeeOutcome) {
  switch (outcome) {
    case 'CREDITED':
      return 'RESERVATION_FEE_CREDITED' as const;
    case 'FORFEITED':
      return 'RESERVATION_FEE_FORFEITED' as const;
    case 'REFUNDED':
      return 'REFUND_ISSUED' as const;
  }
}
