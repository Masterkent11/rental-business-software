import { postgresVerificationRepository } from '@/infrastructure/postgres/repositories/postgres-verification.repository.ts';
export async function verifiedDraft(input: { applicantId: string; resourceId: string; desiredMoveIn: string; desiredTermMonths: number; message: string }) {
  const repo = postgresVerificationRepository();
  const draft = await repo.saveDraft(input.applicantId, { ...input, occupants: 1 });
  const s = await repo.resume(input.applicantId, draft.id);
  await repo.save({ ...s, status: 'VERIFIED' }, s.version);
  return draft.id;
}
