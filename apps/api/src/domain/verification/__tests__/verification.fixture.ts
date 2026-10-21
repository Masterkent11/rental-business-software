import type { VerificationSession } from '@/domain/verification/verification.ts';
export const session = (overrides: Partial<VerificationSession> = {}): VerificationSession => ({
  id: 's1', userId: 'u1', draftId: 'd1', version: 1, status: 'FRONT_READY', expiresAt: '2099-01-01T00:00:00Z',
  consentAt: '2026-10-21T00:00:00Z', consentVersion: 'identity-v1', captureId: null, frontPath: null, evidence: [],
  extracted: null, confidence: null, reviewed: null, challenge: null, failure: null, ...overrides,
});
