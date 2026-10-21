import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
import type { IdGenerator } from '@/application/ports/providers/id-generator.port.ts';
import { assertVerificationState } from '@/domain/verification/verification.ts';
export const prepareFaceChallenge = (repo: VerificationRepository, ids: IdGenerator) => async (userId: string, id: string) => {
  const s = await repo.get(userId, id);
  assertVerificationState(s, ['DETAILS_CONFIRMED','CHALLENGE_ACTIVE','VERIFYING'], new Date());
  if (s.challenge && new Date(s.challenge.expiresAt) > new Date()) return s;
  assertVerificationState(s, ['DETAILS_CONFIRMED'], new Date());
  const expiresAt = new Date(Math.min(Date.now() + 180_000, new Date(s.expiresAt).getTime())).toISOString();
  return repo.save({ ...s, challenge: { id: ids.generateId(), expiresAt, instruction: 'ALIGN' },
    evidence: [], status: 'CHALLENGE_ACTIVE' }, s.version);
};
