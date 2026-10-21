import type { ApplicationDraft, VerificationSession } from '@/domain/verification/verification.ts';
export const toDraftResponse = (d: ApplicationDraft | null) => d && ({
  id: d.id, resourceId: d.resourceId, desiredMoveIn: d.desiredMoveIn,
  desiredTermMonths: d.desiredTermMonths, occupants: d.occupants, message: d.message, applicationId: d.applicationId,
});
export const toVerificationResponse = (s: VerificationSession) => ({
  id: s.id, version: s.version, draftId: s.draftId, status: s.status, expiresAt: s.expiresAt,
  extracted: s.extracted, confidence: s.confidence, reviewed: s.reviewed,
  challenge: s.challenge, failure: s.failure,
});
