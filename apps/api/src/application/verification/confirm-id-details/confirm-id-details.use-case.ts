import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
import { assertVerificationState, validateIdentityDetails, type IdentityDetails } from '@/domain/verification/verification.ts';
export const confirmIdDetails = (repo: VerificationRepository) => async (userId: string, id: string, details: IdentityDetails) => {
  const s = await repo.get(userId, id);
  const reviewed = validateIdentityDetails(details, new Date());
  if (s.status === 'DETAILS_CONFIRMED' && JSON.stringify(s.reviewed) === JSON.stringify(reviewed)) return s;
  assertVerificationState(s, ['OCR_REVIEW'], new Date());
  return repo.save({ ...s, reviewed, status: 'DETAILS_CONFIRMED' }, s.version);
};
