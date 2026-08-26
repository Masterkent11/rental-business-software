import type { Centavos } from '../shared/money.ts';

/**
 * A request to rent long-term. Long-term only (D-06).
 *
 * **An application places no hold.** Many customers may apply for one resource;
 * approval is what takes it off the market. That is the rule this whole file
 * exists to keep — a queue of hopeful applicants is the normal state of a good
 * listing, and a platform that held inventory for each of them would have
 * nothing left to sell.
 *
 * The one exception is a reservation fee, which is a separate decision the
 * customer pays for. See [Reservation].
 */
export type ApplicationState =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED';

/** Applicant-supplied evidence. The platform screens nothing (D-27). */
export type DocumentKind =
  | 'GOVERNMENT_ID'
  | 'PROOF_OF_INCOME'
  | 'EMPLOYMENT_LETTER'
  | 'BUSINESS_PERMIT'
  | 'OTHER';

export interface Application {
  readonly id: string;
  readonly organizationId: string;
  readonly resourceId: string;
  readonly applicantId: string;
  readonly desiredMoveIn: string;
  readonly desiredTermMonths: number;
  readonly message: string;
  readonly state: ApplicationState;
  readonly decisionReason: string | null;
  readonly decidedAt: Date | null;
  readonly createdAt: Date;
}

/** Nothing more can happen to an application in these states. */
const TERMINAL: ReadonlySet<ApplicationState> = new Set([
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
  'EXPIRED',
]);

export function isOpen(state: ApplicationState): boolean {
  return !TERMINAL.has(state);
}

export class InvalidTransitionError extends Error {}

/**
 * The transitions an owner may make.
 *
 * Deliberately not a general "set the state" call: an application that can go
 * from REJECTED back to SUBMITTED is one where a decision can be quietly
 * reversed, and the applicant would never know.
 */
export function assertOwnerMayDecide(
  current: ApplicationState,
  next: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW',
): void {
  if (!isOpen(current)) {
    throw new InvalidTransitionError(
      `This application is already ${current.toLowerCase()}`,
    );
  }
  if (next === 'UNDER_REVIEW' && current !== 'SUBMITTED') {
    throw new InvalidTransitionError('Already under review');
  }
}

export function assertApplicantMayWithdraw(current: ApplicationState): void {
  if (!isOpen(current)) {
    throw new InvalidTransitionError(
      `This application is already ${current.toLowerCase()}`,
    );
  }
}

/**
 * A rejection must say why.
 *
 * The reason is shown to the applicant. A refusal with no explanation is the
 * thing customers complain about most, and an owner who has to type one
 * sentence is an owner who has actually decided.
 */
export function assertRejectionHasReason(reason: string | undefined): string {
  const trimmed = (reason ?? '').trim();
  if (trimmed.length < 3) {
    throw new InvalidTransitionError('A rejection needs a reason');
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// Reservation
// ---------------------------------------------------------------------------

/**
 * The optional way to hold a place while the owner decides.
 *
 * Paying it places a HELD occupancy for [RESERVATION_DAYS] days, so a customer
 * who is serious is not out-competed during the wait. It is the only thing on
 * the long-term path that touches the timeline before a lease exists.
 */
export type ReservationState =
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'CREDITED'
  | 'REFUNDED'
  | 'FORFEITED'
  | 'EXPIRED';

export const RESERVATION_DAYS = 7;

/**
 * How long an approved applicant has to pay the advance and deposit.
 *
 * Shorter than a reservation deliberately: a reservation is bought while the
 * owner thinks, whereas this window starts once the owner has already said yes
 * and the resource is off the market for one named person. Every hour of it is
 * an hour nobody else can rent the place.
 */
export const APPROVAL_HOLD_HOURS = 72;

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
