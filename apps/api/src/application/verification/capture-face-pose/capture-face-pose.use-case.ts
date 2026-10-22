import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
import type { VerificationImageValidator } from '@/application/ports/providers/verification-image.port.ts';
import type { VerificationEvidenceStorage } from '@/application/ports/storage/verification-evidence.port.ts';
import { assertVerificationState, FACE_SEQUENCE, VerificationConflictError, type FaceInstruction } from '@/domain/verification/verification.ts';
export const captureFacePose = (repo: VerificationRepository, images: VerificationImageValidator, storage: VerificationEvidenceStorage) => async (
  userId: string, id: string, challengeId: string, instruction: FaceInstruction, evidenceId: string, image: Uint8Array,
) => {
  const s = await repo.get(userId, id);
  assertVerificationState(s, ['CHALLENGE_ACTIVE','VERIFYING'], new Date());
  if (!s.challenge || s.challenge.id !== challengeId || new Date(s.challenge.expiresAt) <= new Date()) {
    throw new VerificationConflictError('The facial challenge expired. Scan your ID again.');
  }
  if (s.evidence.some(e => e.id === evidenceId)) return s;
  if (s.status !== 'CHALLENGE_ACTIVE' || s.challenge.instruction !== instruction) throw new VerificationConflictError('Refresh before the next capture.');
  await repo.admitCapture(userId);
  const bytes = await images.validate(image);
  const path = await storage.put({ userId, sessionId: id, captureId: s.captureId!, evidenceId, bytes, expiresAt: s.expiresAt });
  const evidence = [...s.evidence, { id: evidenceId, instruction, path }];
  const next = FACE_SEQUENCE[evidence.length];
  return repo.save({ ...s, evidence, challenge: { ...s.challenge, instruction: next ?? instruction },
    status: next ? 'CHALLENGE_ACTIVE' : 'VERIFYING' }, s.version);
};
