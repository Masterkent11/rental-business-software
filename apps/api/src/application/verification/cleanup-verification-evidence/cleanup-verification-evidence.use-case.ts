import type { VerificationEvidenceStorage } from '@/application/ports/storage/verification-evidence.port.ts';
export const cleanupVerificationEvidence = (storage: VerificationEvidenceStorage) => () => storage.cleanupExpired();
