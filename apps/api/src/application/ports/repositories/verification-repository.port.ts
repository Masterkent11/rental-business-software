import type { ApplicationDraft, ApplicationDraftInput, VerificationSession } from '@/domain/verification/verification.ts';

export interface VerificationRepository {
  admitCapture(userId: string): Promise<void>;
  saveDraft(userId: string, input: ApplicationDraftInput): Promise<ApplicationDraft>;
  findDraft(userId: string, resourceId: string): Promise<ApplicationDraft | null>;
  draftById(userId: string, draftId: string): Promise<ApplicationDraft>;
  resume(userId: string, draftId: string): Promise<VerificationSession>;
  get(userId: string, sessionId: string): Promise<VerificationSession>;
  save(session: VerificationSession, expectedVersion: number): Promise<VerificationSession>;
}
