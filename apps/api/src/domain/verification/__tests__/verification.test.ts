import { describe, expect, it } from 'vitest';
import { assertVerificationState, validateIdentityDetails, validateApplicationDraft, VerificationConflictError, VerificationInputError } from '@/domain/verification/verification.ts';
import { session } from '@/domain/verification/__tests__/verification.fixture.ts';
const now = new Date('2026-10-21T02:00:00Z');
const details = { fullName: 'Ana Santos', dateOfBirth: '1998-07-06', documentType: 'Passport', documentNumber: 'TEST-0001' };
describe('verification rules', () => {
  it('distinguishes OCR confirmation from a verified identity', () => {
    expect(() => assertVerificationState(session({ status: 'DETAILS_CONFIRMED' }), ['VERIFIED'], now)).toThrow(VerificationConflictError);
  });
  it.each(['EXPIRED','CANCELLED','FAILED'] as const)('rejects %s for submission', status => {
    expect(() => assertVerificationState(session({ status }), ['VERIFIED'], now)).toThrow(VerificationConflictError);
  });
  it('rejects an expired verified result', () => {
    expect(() => assertVerificationState(session({ status: 'VERIFIED', expiresAt: now.toISOString() }), ['VERIFIED'], now)).toThrow(VerificationConflictError);
  });
  it.each(['1998-02-30','2030-01-01','1899-12-31','01/01/2000'])('rejects invalid birth date %s', dateOfBirth => {
    expect(() => validateIdentityDetails({ ...details, dateOfBirth }, now)).toThrow(VerificationInputError);
  });
  it('requires complete reviewed fields', () => {
    expect(() => validateIdentityDetails({ ...details, documentNumber: ' ' }, now)).toThrow(VerificationInputError);
    expect(validateIdentityDetails({ ...details, fullName: ' Ana Santos ' }, now).fullName).toBe('Ana Santos');
  });
  it('validates calendar dates and occupancy', () => {
    const draft = { resourceId: 'r', desiredMoveIn: '2026-11-01', desiredTermMonths: 12, occupants: 1, message: '' };
    expect(() => validateApplicationDraft(draft, now)).not.toThrow();
    for (const input of [{ ...draft, desiredMoveIn: '2026-02-30' }, { ...draft, occupants: 0 }, { ...draft, desiredMoveIn: '2026-10-20' }]) {
      expect(() => validateApplicationDraft(input, now)).toThrow(VerificationInputError);
    }
  });
});
