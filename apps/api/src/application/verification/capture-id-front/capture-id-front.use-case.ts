import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
import type { VerificationImageValidator } from '@/application/ports/providers/verification-image.port.ts';
import type { VerificationEvidenceStorage } from '@/application/ports/storage/verification-evidence.port.ts';
import { assertVerificationState, type IdentityDetails } from '@/domain/verification/verification.ts';
export const captureIdFront = (repo: VerificationRepository, images: VerificationImageValidator, storage: VerificationEvidenceStorage) =>
  async (userId: string, id: string, captureId: string, image: Uint8Array, extracted: IdentityDetails, confidence: Partial<Record<keyof IdentityDetails, number>> = {}) => {
    const s = await repo.get(userId, id);
    assertVerificationState(s, ['FRONT_READY','OCR_REVIEW','DETAILS_CONFIRMED','CHALLENGE_ACTIVE','VERIFYING','VERIFIED','FAILED'], new Date());
    if (s.captureId === captureId) return s;
    await repo.admitCapture(userId);
    const bytes = await images.validate(image);
    const path = await storage.put({ userId, sessionId: id, captureId, evidenceId: 'front', bytes, expiresAt: s.expiresAt });
    const next = await repo.save({ ...s, captureId, frontPath: path, status: 'OCR_REVIEW', extracted,
        confidence, reviewed: null, review: null, challenge: null, evidence: [], failure: null }, s.version);
    await storage.remove(userId, [s.frontPath, ...s.evidence.map(e => e.path)].filter((p): p is string => p !== null)).catch(() => undefined);
    return next;
  };
