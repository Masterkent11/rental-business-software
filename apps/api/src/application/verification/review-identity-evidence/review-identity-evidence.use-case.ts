import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
import type { VerificationEvidenceStorage } from '@/application/ports/storage/verification-evidence.port.ts';
import { hasCapability, type Principal } from '@/domain/identity/identity.ts';
import { OrganizationForbiddenError } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import { assertVerificationState } from '@/domain/verification/verification.ts';

export const reviewIdentityEvidence = (repo: VerificationRepository, storage: VerificationEvidenceStorage) =>
  async (principal: Principal, userId: string, sessionId: string) => {
    if (!hasCapability(principal, 'PLATFORM_ADMIN')) throw new OrganizationForbiddenError('Only platform identity reviewers may access evidence.');
    const session = await repo.get(userId, sessionId);
    assertVerificationState(session, ['MANUAL_REVIEW'], new Date());
    const captures = [
      ...(session.frontPath ? [{ instruction: 'FRONT', path: session.frontPath }] : []),
      ...session.evidence,
    ];
    const seconds = Math.max(1, Math.min(60, Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000)));
    return { id: session.id, version: session.version, details: session.reviewed,
      evidence: await Promise.all(captures.map(async capture => ({ instruction: capture.instruction,
        url: await storage.reviewUrl(userId, capture.path, seconds) }))) };
  };
