import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
export const cancelVerification = (repo: VerificationRepository) => async (userId: string, id: string) => {
  const s = await repo.get(userId, id);
  if (s.status === 'CANCELLED' || s.status === 'EXPIRED') return s;
  return repo.save({ ...s, status: 'CANCELLED', extracted: null, confidence: null, reviewed: null, challenge: null }, s.version);
};
