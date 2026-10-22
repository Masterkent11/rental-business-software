import type { VerificationSession } from '@/domain/verification/verification.ts';
export interface VerificationDecision {
  readonly sessionId: string;
  readonly captureId: string;
  readonly challengeId: string;
  readonly expiresAt: string;
  readonly verified: boolean;
  readonly manualReview?: boolean;
  readonly retryable: boolean;
}
export interface VerificationProvider {
  verify(session: VerificationSession): Promise<VerificationDecision>;
}
