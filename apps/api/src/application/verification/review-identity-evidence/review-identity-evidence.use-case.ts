import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
import type { VerificationEvidenceStorage } from '@/application/ports/storage/verification-evidence.port.ts';
import { type Principal } from '@/domain/identity/identity.ts';
import type { authorizeAdministration } from '@/application/administration/authorize-administration/authorize-administration.use-case.ts';
import type { AdministrativeAudit } from '@/domain/administration/administration.ts';
import { assertVerificationState } from '@/domain/verification/verification.ts';

export const reviewIdentityEvidence = (repo: VerificationRepository, storage: VerificationEvidenceStorage, authorize: ReturnType<typeof authorizeAdministration>) =>
  async (principal: Principal, userId: string, sessionId: string, audit: AdministrativeAudit) => {
    await authorize(principal,'IDENTITY_REVIEW',audit,userId);
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
