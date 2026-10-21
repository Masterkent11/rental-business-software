import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
import { validateApplicationDraft, type ApplicationDraftInput } from '@/domain/verification/verification.ts';
export const saveApplicationDraft = (repo: VerificationRepository) => async (userId: string, input: ApplicationDraftInput) => {
  validateApplicationDraft(input, new Date());
  return repo.saveDraft(userId, input);
};
