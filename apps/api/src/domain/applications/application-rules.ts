import type { ApplicationState } from './application-state.ts';
import { InvalidTransitionError } from './application-errors.ts';

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

export function applicationMessageWithOccupants(message: string, occupants: number): string {
  const summary = `${occupants} ${occupants === 1 ? 'person' : 'people'} expected to live here.`;
  return message.trim() ? `${summary}\n\n${message.trim()}` : summary;
}
