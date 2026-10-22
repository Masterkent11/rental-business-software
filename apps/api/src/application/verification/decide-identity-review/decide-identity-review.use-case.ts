import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
import { hasCapability, type Principal } from '@/domain/identity/identity.ts';
import { OrganizationForbiddenError } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import { assertVerificationState, VerificationConflictError, VerificationInputError } from '@/domain/verification/verification.ts';

export const decideIdentityReview = (repo: VerificationRepository) =>
  async (principal: Principal, input: {
    userId: string; sessionId: string; version: number; approved: boolean; evidenceReviewed: true; validUntil: string | null;
  }) => {
    if (!hasCapability(principal, 'PLATFORM_ADMIN')) throw new OrganizationForbiddenError('Only platform identity reviewers may decide verification.');
    const session = await repo.get(input.userId, input.sessionId);
    assertVerificationState(session, ['MANUAL_REVIEW'], new Date());
    if (session.version !== input.version) throw new VerificationConflictError('Evidence changed. Review the current capture.');
    if (!input.evidenceReviewed || !session.frontPath || !session.reviewed || session.evidence.length !== 4) {
      throw new VerificationInputError('Review the complete document and facial evidence before deciding.');
    }
    if (input.approved && (!input.validUntil || !Number.isFinite(Date.parse(input.validUntil)) || Date.parse(input.validUntil) <= Date.now())) {
      throw new VerificationInputError('Set a future validity date for the reviewed identity.');
    }
    return repo.save({ ...session, status: input.approved ? 'VERIFIED' : 'FAILED',
      review: { reviewerId: principal.userId, decidedAt: new Date().toISOString(), approved: input.approved, validUntil: input.approved ? input.validUntil : null },
      failure: input.approved ? null : { code: 'MANUAL_REVIEW_REJECTED', message: 'Your identity evidence could not be confirmed. Please retake your captures.', retryable: true },
    }, session.version);
  };
