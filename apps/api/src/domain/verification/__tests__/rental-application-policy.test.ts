import { describe, expect, it } from 'vitest';
import { assertApplicationPolicy, VerificationInputError, type RentalApplicationPolicy } from '@/domain/verification/verification.ts';
import { assertLeaseDurationLimits } from '@/domain/listings/listing.ts';
const input = { resourceId: 'r', desiredMoveIn: '2029-01-01', desiredTermMonths: 3, occupants: 2, message: '' };
const policy: RentalApplicationPolicy = { kind: 'LONG_TERM', intent: 'RENT', state: 'PUBLISHED', rentalMode: 'LONG_TERM',
  maxOccupants: 2, minLeaseMonths: null, maxLeaseMonths: null, availableFrom: null };
describe('listing application eligibility', () => {
  it('allows requested terms without imposing a universal six-month minimum', () => {
    expect(() => assertApplicationPolicy(input, policy)).not.toThrow();
    expect(() => assertApplicationPolicy(input, { ...policy, rentalMode: 'HYBRID' })).not.toThrow();
  });
  it.each([{ kind: 'SHORT_TERM' }, { intent: 'SALE' }, { state: 'DRAFT' }, { rentalMode: 'SHORT_TERM' },
    { maxOccupants: 1 }, { minLeaseMonths: 6 }, { maxLeaseMonths: 2 }, { availableFrom: '2030-01-01' }])('enforces configured policy %j', changes => {
    expect(() => assertApplicationPolicy(input, { ...policy, ...changes })).toThrow(VerificationInputError);
  });
  it('rejects invalid and inverted duration limits before persistence', () => {
    expect(() => assertLeaseDurationLimits({ minLeaseMonths: 12, maxLeaseMonths: 6 })).toThrow();
    expect(() => assertLeaseDurationLimits({ minLeaseMonths: 0 })).toThrow();
    expect(() => assertLeaseDurationLimits({ maxLeaseMonths: 61 })).toThrow();
  });
});
