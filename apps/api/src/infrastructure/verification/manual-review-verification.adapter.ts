import type { VerificationProvider } from '@/application/ports/providers/verification-provider.port.ts';
import { VerificationConflictError } from '@/domain/verification/verification.ts';

export function manualReviewVerificationProvider(): VerificationProvider {
  return { async verify(session) {
    if (!session.captureId || !session.frontPath || !session.reviewed || !session.challenge || session.evidence.length !== 4) {
      throw new VerificationConflictError('Complete ID and facial capture before review.');
    }
    return { sessionId: session.id, captureId: session.captureId, challengeId: session.challenge.id,
      expiresAt: session.expiresAt, verified: false, manualReview: true, retryable: false };
  } };
}
