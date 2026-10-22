import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
export const resumeVerification = (repo: VerificationRepository) => (userId: string, draftId: string) => repo.resume(userId, draftId);
