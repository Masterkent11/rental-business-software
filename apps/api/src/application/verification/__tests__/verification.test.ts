import { reviewIdentityEvidence } from '@/application/verification/review-identity-evidence/review-identity-evidence.use-case.ts';
import { decideIdentityReview } from '@/application/verification/decide-identity-review/decide-identity-review.use-case.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { describe, expect, it, vi } from 'vitest';
import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
import type { VerificationEvidenceStorage } from '@/application/ports/storage/verification-evidence.port.ts';
import { session } from '@/domain/verification/__tests__/verification.fixture.ts';
import { VerificationConflictError, VerificationInputError, VerificationUnavailableError } from '@/domain/verification/verification.ts';
import { recordVerificationConsent } from '@/application/verification/record-verification-consent/record-verification-consent.use-case.ts';
import { captureIdFront } from '@/application/verification/capture-id-front/capture-id-front.use-case.ts';
import { confirmIdDetails } from '@/application/verification/confirm-id-details/confirm-id-details.use-case.ts';
import { prepareFaceChallenge } from '@/application/verification/prepare-face-challenge/prepare-face-challenge.use-case.ts';
import { captureFacePose } from '@/application/verification/capture-face-pose/capture-face-pose.use-case.ts';
import { getVerificationStatus } from '@/application/verification/get-verification-status/get-verification-status.use-case.ts';
import type { VerificationProvider } from '@/application/ports/providers/verification-provider.port.ts';
const details = { fullName: 'Ana Santos', dateOfBirth: '1998-07-06', documentType: 'Passport', documentNumber: 'TEST-0001' };
const setup = (value = session()) => {
  let current = value;
  const repo: VerificationRepository = {
    get: vi.fn(async (userId, id) => { if (userId !== current.userId || id !== current.id) throw new Error('Not found'); return current; }),
    save: vi.fn(async (next, expected) => {
      if (expected !== current.version) throw new VerificationConflictError('Stale result');
      current = { ...next, version: expected + 1 }; return current;
    }),
    admitCapture: vi.fn(async () => {}), saveDraft: vi.fn(), findDraft: vi.fn(), draftById: vi.fn(), resume: vi.fn(),
  };
  const storage: VerificationEvidenceStorage = { put: vi.fn(async () => 'u1/s1/front.jpg'), remove: vi.fn(async () => {}), reviewUrl: vi.fn(async () => 'https://private.test/evidence'), cleanupExpired: vi.fn() };
  return { repo, storage, current: () => current };
};
describe('custom verification lifecycle', () => {
  it('records versioned consent once', async () => {
    const { repo } = setup(session({ status: 'CONSENT_REQUIRED', consentVersion: null }));
    const consent = recordVerificationConsent(repo);
    await expect(consent('u1','s1','old')).rejects.toThrow(VerificationInputError);
    expect((await consent('u1','s1','identity-v1')).status).toBe('FRONT_READY');
    await consent('u1','s1','identity-v1');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });
  it('processes only the front and treats client OCR as unconfirmed transcription', async () => {
    const { repo, storage } = setup();
    const capture = captureIdFront(repo, { validate: async bytes => bytes }, storage);
    const result = await capture('u1','s1','c1',new Uint8Array([1]),details);
    expect(result.status).toBe('OCR_REVIEW'); expect(result.reviewed).toBeNull();
    expect(result.frontPath).toBeTruthy(); expect(result.challenge).toBeNull();
    await capture('u1','s1','c1',new Uint8Array([1]),details);
    expect(storage.put).toHaveBeenCalledTimes(1);
  });
  it('invalidates previous verification on recapture', async () => {
    const { repo, storage } = setup(session({ status: 'VERIFIED', captureId: 'old', frontPath: 'u1/old.jpg', reviewed: details }));
    const next = await captureIdFront(repo, { validate: async bytes => bytes }, storage)('u1','s1','new',new Uint8Array([1]), details);
    expect(next.status).toBe('OCR_REVIEW'); expect(next.reviewed).toBeNull();
    expect(storage.remove).toHaveBeenCalledWith('u1',['u1/old.jpg']);
  });
  it('cannot confirm missing fields or edit a verified identity', async () => {
    const { repo } = setup(session({ status: 'OCR_REVIEW', extracted: details }));
    await expect(confirmIdDetails(repo)('u1','s1',{ ...details, fullName: '' })).rejects.toThrow(VerificationInputError);
    expect((await confirmIdDetails(repo)('u1','s1',details)).status).toBe('DETAILS_CONFIRMED');
    const verified = setup(session({ status: 'VERIFIED' }));
    await expect(confirmIdDetails(verified.repo)('u1','s1',details)).rejects.toThrow(VerificationConflictError);
  });
  it('binds challenge and progression to the session; movements alone remain unverified', async () => {
    const { repo, storage } = setup(session({ status: 'DETAILS_CONFIRMED', captureId: 'c1', frontPath: 'u1/front.jpg', reviewed: details }));
    const prepared = await prepareFaceChallenge(repo, { generateId: () => 'challenge1' })('u1','s1');
    expect(prepared.challenge?.instruction).toBe('ALIGN');
    const capture = captureFacePose(repo, { validate: async bytes => bytes }, storage);
    await expect(capture('u1','s1','other','ALIGN','e0',new Uint8Array([1]))).rejects.toThrow(VerificationConflictError);
    for (const [index, pose] of (['ALIGN','RIGHT','LEFT','UP'] as const).entries()) {
      await capture('u1','s1','challenge1',pose,`e${index}`,new Uint8Array([index]));
    }
    expect((await repo.get('u1','s1')).status).toBe('VERIFYING');
    await capture('u1','s1','challenge1','UP','e3',new Uint8Array([3]));
    expect(storage.put).toHaveBeenCalledTimes(4);
  });
  it('rejects expired and out-of-order evidence', async () => {
    const { repo, storage } = setup(session({ status: 'CHALLENGE_ACTIVE', challenge: { id: 'c', expiresAt: '2000-01-01T00:00:00Z', instruction: 'RIGHT' } }));
    await expect(captureFacePose(repo, { validate: async b => b }, storage)('u1','s1','c','LEFT','e',new Uint8Array([1]))).rejects.toThrow(VerificationConflictError);
    expect(storage.put).not.toHaveBeenCalled();
  });
  it('accepts only an authoritative result bound to the current capture', async () => {
    const { repo } = setup(session({ status: 'VERIFYING', captureId: 'c1', challenge: { id: 'h1', expiresAt: '2099-01-01T00:00:00Z', instruction: 'UP' } }));
    const decide: VerificationProvider = { verify: vi.fn(async s => ({ sessionId: s.id, captureId: 'old', challengeId: 'h1', expiresAt: s.expiresAt, verified: true, retryable: false })) };
    await expect(getVerificationStatus(repo, decide)('u1','s1')).rejects.toThrow(VerificationConflictError);
    decide.verify = async s => ({ sessionId: s.id, captureId: s.captureId!, challengeId: s.challenge!.id, expiresAt: s.expiresAt, verified: true, retryable: false });
    expect((await getVerificationStatus(repo, decide)('u1','s1')).status).toBe('VERIFIED');
  });
  it('leaves pending verification pending when the server engine is unavailable', async () => {
    const { repo } = setup(session({ status: 'VERIFYING' }));
    await expect(getVerificationStatus(repo, { verify: async () => { throw new VerificationUnavailableError('Unavailable'); } })('u1','s1')).rejects.toThrow(VerificationUnavailableError);
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('cannot overwrite a newer recapture with a late server result', async () => {
    const { repo } = setup(session({ status: 'VERIFYING', captureId: 'c1', challenge: { id: 'h', expiresAt: '2099-01-01T00:00:00Z', instruction: 'UP' } }));
    let finish!: (result: Awaited<ReturnType<VerificationProvider['verify']>>) => void;
    const result = getVerificationStatus(repo, { verify: () => new Promise(resolve => { finish = resolve; }) })('u1','s1');
    await Promise.resolve();
    const old = await repo.get('u1','s1');
    await repo.save({ ...old, captureId: 'new', status: 'OCR_REVIEW' }, old.version);
    finish({ sessionId: 's1', captureId: 'c1', challengeId: 'h', expiresAt: old.expiresAt, verified: true, retryable: false });
    await expect(result).rejects.toThrow(VerificationConflictError);
    expect((await repo.get('u1','s1')).captureId).toBe('new');
  });
  it('does not upload invalid images', async () => {
    const { repo, storage } = setup();
    await expect(captureIdFront(repo, { validate: async () => { throw new VerificationInputError('Bad image'); } }, storage)('u1','s1','c',new Uint8Array(),details)).rejects.toThrow(VerificationInputError);
    expect(storage.put).not.toHaveBeenCalled();
  });
});

describe('manual identity review', () => {
  const reviewer: Principal = { userId: 'admin', displayName: 'Reviewer', organizationId: null,
    capabilities: [{ capability: 'PLATFORM_ADMIN', organizationId: null }] };
  const pending = () => session({ status: 'MANUAL_REVIEW', captureId: 'c1', frontPath: 'u1/s1/front.jpg', reviewed: details,
    challenge: { id: 'h', expiresAt: '2099-01-01T00:00:00Z', instruction: 'UP' },
    evidence: ['ALIGN', 'RIGHT', 'LEFT', 'UP'].map((instruction, i) => ({ id: `${i}`, instruction: instruction as 'ALIGN' | 'RIGHT' | 'LEFT' | 'UP', path: `u1/s1/${i}.jpg` })) });
  const decision = { userId: 'u1', sessionId: 's1', version: 1, approved: true, evidenceReviewed: true as const, validUntil: '2099-01-01T00:00:00Z' };
  it('prevents renters and owners from reading evidence or marking identity verified', async () => {
    const { repo, storage } = setup(pending());
    const renter = { ...reviewer, capabilities: [] };
    await expect(reviewIdentityEvidence(repo, storage)(renter, 'u1', 's1')).rejects.toThrow('Only platform');
    await expect(decideIdentityReview(repo)(renter, decision)).rejects.toThrow('Only platform');
    expect(repo.get).not.toHaveBeenCalled();
    expect(storage.reviewUrl).not.toHaveBeenCalled();
  });
  it('returns short-lived private evidence only to authorized reviewers', async () => {
    const { repo, storage } = setup(pending());
    const view = await reviewIdentityEvidence(repo, storage)(reviewer, 'u1', 's1');
    expect(view.evidence).toHaveLength(5);
    expect(storage.reviewUrl).toHaveBeenCalledWith('u1', 'u1/s1/front.jpg', 60);
  });
  it('records an explicit reviewer decision, rejects stale decisions and replays', async () => {
    const { repo } = setup(pending());
    await expect(decideIdentityReview(repo)(reviewer, { ...decision, version: 0 })).rejects.toThrow(VerificationConflictError);
    await expect(decideIdentityReview(repo)(reviewer, { ...decision, validUntil: null })).rejects.toThrow(VerificationInputError);
    const approved = await decideIdentityReview(repo)(reviewer, decision);
    expect(approved.status).toBe('VERIFIED'); expect(approved.review?.reviewerId).toBe('admin');
    await expect(decideIdentityReview(repo)(reviewer, decision)).rejects.toThrow(VerificationConflictError);
  });
  it('routes the trusted provider pending decision to manual review without showing success', async () => {
    const current = pending();
    const { repo } = setup({ ...current, status: 'VERIFYING' });
    const provider: VerificationProvider = { verify: async s => ({ sessionId: s.id, captureId: s.captureId!, challengeId: s.challenge!.id,
      expiresAt: s.expiresAt, verified: false, manualReview: true, retryable: false }) };
    expect((await getVerificationStatus(repo, provider)('u1', 's1')).status).toBe('MANUAL_REVIEW');
  });
});
