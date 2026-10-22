import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
export const getApplicationDraft = (repo: VerificationRepository) => (userId: string, resourceId: string) => repo.findDraft(userId, resourceId);
