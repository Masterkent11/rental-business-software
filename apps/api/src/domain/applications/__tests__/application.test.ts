import { describe, expect, it } from 'vitest';
import {
  InvalidTransitionError,
  assertApplicantMayWithdraw,
  assertOwnerMayDecide,
  assertRejectionHasReason,
  isOpen,
  ledgerTypeFor,
  outcomeFor,
} from '@/domain/applications/application.ts';

describe('application transitions', () => {
  it('lets an owner decide an open application', () => {
    expect(() => assertOwnerMayDecide('SUBMITTED', 'APPROVED')).not.toThrow();
    expect(() => assertOwnerMayDecide('UNDER_REVIEW', 'REJECTED')).not.toThrow();
  });

  it('refuses to re-decide a decided application', () => {
    // An application that can go from REJECTED back to SUBMITTED is one where a
    // decision can be quietly reversed, and the applicant would never know.
    for (const state of ['APPROVED', 'REJECTED', 'WITHDRAWN', 'EXPIRED'] as const) {
      expect(() => assertOwnerMayDecide(state, 'APPROVED')).toThrow(
        InvalidTransitionError,
      );
    }
  });

  it('refuses to re-open a review', () => {
    expect(() => assertOwnerMayDecide('UNDER_REVIEW', 'UNDER_REVIEW')).toThrow(
      InvalidTransitionError,
    );
  });

  it('lets an applicant withdraw while it is open', () => {
    expect(() => assertApplicantMayWithdraw('SUBMITTED')).not.toThrow();
    expect(() => assertApplicantMayWithdraw('UNDER_REVIEW')).not.toThrow();
  });

  it('refuses withdrawal after a decision', () => {
    expect(() => assertApplicantMayWithdraw('APPROVED')).toThrow(
      InvalidTransitionError,
    );
  });

  it('knows which states are still open', () => {
    expect(isOpen('SUBMITTED')).toBe(true);
    expect(isOpen('APPROVED')).toBe(false);
  });
});

describe('a rejection must say why', () => {
  it('accepts a real reason', () => {
    expect(assertRejectionHasReason('  Income below the owner threshold ')).toBe(
      'Income below the owner threshold',
    );
  });

  it('refuses an empty or token reason', () => {
    // A refusal with no explanation is what customers complain about most.
    for (const reason of [undefined, '', '   ', 'no']) {
      expect(() => assertRejectionHasReason(reason)).toThrow(
        InvalidTransitionError,
      );
    }
  });
});

describe('what happens to the reservation fee', () => {
  it('credits it on approval', () => {
    // Not a refund and not revenue: a claim the tenant holds against their
    // first invoice.
    expect(outcomeFor('APPROVED')).toBe('CREDITED');
    expect(ledgerTypeFor('CREDITED')).toBe('RESERVATION_FEE_CREDITED');
  });

  it('refunds it on rejection', () => {
    // The customer did nothing wrong and must not be out of pocket.
    expect(outcomeFor('REJECTED')).toBe('REFUNDED');
    expect(ledgerTypeFor('REFUNDED')).toBe('REFUND_ISSUED');
  });

  it('forfeits it on withdrawal', () => {
    // The resource was held off the market for this person; the owner carried
    // that cost.
    expect(outcomeFor('WITHDRAWN')).toBe('FORFEITED');
    expect(ledgerTypeFor('FORFEITED')).toBe('RESERVATION_FEE_FORFEITED');
  });
});
