import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
import { assertVerificationState, VERIFICATION_CONSENT_VERSION, VerificationInputError } from '@/domain/verification/verification.ts';
export const recordVerificationConsent = (repo: VerificationRepository) => async (userId: string, id: string, version: string) => {
  const s = await repo.get(userId, id);
  if (version !== VERIFICATION_CONSENT_VERSION) throw new VerificationInputError('Read and accept the current identity consent.');
  if (s.consentVersion === version && s.status !== 'CANCELLED' && s.status !== 'EXPIRED') return s;
  assertVerificationState(s, ['CONSENT_REQUIRED'], new Date());
  return repo.save({ ...s, status: 'FRONT_READY', consentVersion: version, consentAt: new Date().toISOString() }, s.version);
};
