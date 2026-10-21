import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
import type { VerificationProvider } from '@/application/ports/providers/verification-provider.port.ts';
import { VerificationConflictError } from '@/domain/verification/verification.ts';
export const getVerificationStatus = (repo: VerificationRepository, provider: VerificationProvider) => async (userId: string, id: string) => {
  const s = await repo.get(userId, id);
  if (s.status === 'CHALLENGE_ACTIVE' && s.challenge && new Date(s.challenge.expiresAt) <= new Date()) {
    return repo.save({ ...s, status: 'EXPIRED', extracted: null, reviewed: null, challenge: null }, s.version);
  }
  if (s.status !== 'VERIFYING') return s;
  const result = await provider.verify(s);
  if (result.sessionId !== s.id || result.captureId !== s.captureId || result.challengeId !== s.challenge?.id || result.expiresAt !== s.expiresAt) {
    throw new VerificationConflictError('Unrelated verification result.');
  }
  return repo.save({ ...s, status: result.verified ? 'VERIFIED' : result.manualReview ? 'MANUAL_REVIEW' : 'FAILED',
    failure: result.verified || result.manualReview ? null : { code: 'IDENTITY_NOT_VERIFIED',
      message: 'We could not verify your identity. Please try again with a clear ID and good lighting.', retryable: result.retryable } }, s.version);
};
