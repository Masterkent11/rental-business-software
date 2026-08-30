import type { ApplicationState } from './application-state.ts';

export * from './application-state.ts';
export * from './application-rules.ts';
export * from './application-errors.ts';
export * from '@/domain/reservations/reservation.ts';

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
