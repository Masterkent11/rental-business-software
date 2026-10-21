import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { postgresApplicationRepository } from '@/infrastructure/postgres/repositories/postgres-application.repository.ts';
import { postgresVerificationRepository } from '@/infrastructure/postgres/repositories/postgres-verification.repository.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { supabaseVerificationEvidence } from '@/infrastructure/storage/supabase-verification-evidence.adapter.ts';
import { sql, withUser, withScope } from '@/infrastructure/postgres/db.ts';
import { VerificationConflictError, VerificationNotFoundError, VerificationRequiredError } from '@/domain/verification/verification.ts';
const suite = process.env.DATABASE_URL && process.env.TEST_ADMIN_DATABASE_URL ? describe : describe.skip;
const USER = randomUUID(), OTHER = randomUUID();
const RESOURCE = 'b1111111-0000-0000-0000-000000000001';
const ORG = '11111111-1111-1111-1111-111111111111';
const input = { resourceId: RESOURCE, desiredMoveIn: '2029-03-01', desiredTermMonths: 12, occupants: 2, message: 'Two occupants' };
suite('verification isolation and submission transactions', () => {
  const repo = postgresVerificationRepository();
  const applications = postgresApplicationRepository();
  const admin = postgres(process.env.TEST_ADMIN_DATABASE_URL!, { max: 1 });
  beforeAll(async () => {
    for (const id of [USER, OTHER]) await postgresUserRepository().createProfile({ id, email: `${id}@example.test`, mobile: null });
  });
  afterAll(async () => { await admin.end(); await sql.end(); });
  it('keeps one open draft and one session under duplicate requests', async () => {
    const drafts = await Promise.all([repo.saveDraft(USER,input), repo.saveDraft(USER,input)]);
    expect(drafts[0]!.id).toBe(drafts[1]!.id);
    const sessions = await Promise.all([repo.resume(USER,drafts[0]!.id), repo.resume(USER,drafts[0]!.id)]);
    expect(sessions[0]!.id).toBe(sessions[1]!.id);
  });
  it('rejects foreign sessions, drafts, and evidence at the RLS boundary', async () => {
    const draft = await repo.saveDraft(USER,input); const s = await repo.resume(USER,draft.id);
    await expect(repo.get(OTHER,s.id)).rejects.toThrow(VerificationNotFoundError);
    await expect(repo.resume(OTHER,draft.id)).rejects.toThrow(VerificationNotFoundError);
    const other = await withUser(OTHER,tx => tx`select id from identity_verification_sessions`);
    expect(other).toHaveLength(0);
    const owner = await withScope(ORG,tx => tx`select id from identity_verification_sessions`);
    expect(owner).toHaveLength(0);
    await withUser(USER, tx => tx`insert into identity_evidence_uploads(path,user_id,expires_at) values
      (${USER + '/private.jpg'},${USER},now() + interval '30 minutes')`);
    expect(await withUser(OTHER, tx => tx`select path from identity_evidence_uploads`)).toHaveLength(0);
    await expect(admin.begin(async tx => { await tx`set local role authenticated`; await tx`select * from identity_evidence_uploads`; })).rejects.toMatchObject({ code: '42501' });
  });
  it('rejects stale writes and expired sessions', async () => {
    const draft = await repo.saveDraft(USER,input); const s = await repo.resume(USER,draft.id);
    await repo.save({ ...s,status: 'FRONT_READY' },s.version);
    await expect(repo.save({ ...s,status: 'VERIFIED' },s.version)).rejects.toThrow(VerificationConflictError);
    await admin`update identity_verification_sessions set expires_at = now() - interval '1 second' where id = ${s.id}`;
    expect((await repo.get(USER,s.id)).status).toBe('EXPIRED');
    await expect(applications.submit({ ...input,applicantId: USER,draftId: draft.id })).rejects.toThrow(VerificationRequiredError);
    const renewed = await repo.resume(USER,draft.id);
    expect(renewed.id).not.toBe(s.id); expect(renewed.status).toBe('CONSENT_REQUIRED'); expect(renewed.expiresAt).not.toBe(s.expiresAt);
    await expect(repo.save({ ...s,status: 'VERIFIED' },s.version)).rejects.toThrow(VerificationConflictError);
  });
  it('requires valid verification, sends nothing early, and submits once on retry', async () => {
    const draft = await repo.saveDraft(USER,input); const s = await repo.resume(USER,draft.id);
    const count = async () => Number((await withScope(ORG,tx => tx<{ count: string }[]>`select count(*)::text as count from notifications where kind = 'APPLICATION_RECEIVED'`))[0]!.count);
    const before = await count();
    await expect(applications.submit({ ...input,applicantId: USER,draftId: draft.id })).rejects.toThrow(VerificationRequiredError);
    await expect(applications.submit({ ...input,applicantId: OTHER,draftId: draft.id })).rejects.toThrow(VerificationRequiredError);
    expect(await count()).toBe(before);
    await repo.save({ ...s,status: 'VERIFIED' },s.version);
    expect(await count()).toBe(before);
    await expect(applications.submit({ ...input,desiredTermMonths: 6, applicantId: USER,draftId: draft.id })).rejects.toThrow(VerificationConflictError);
    const results = await Promise.all([1,2].map(() => applications.submit({ ...input,applicantId: USER,draftId: draft.id })));
    expect(results[0]!.id).toBe(results[1]!.id); expect(await count()).toBe(before + 1);
    expect((await applications.forOrganization(ORG)).some(a => a.id === results[0]!.id)).toBe(true);
    const old = await repo.get(USER,s.id);
    await expect(repo.save({ ...old,status: 'OCR_REVIEW' },old.version)).rejects.toThrow(VerificationConflictError);
    await admin`update identity_verification_sessions set expires_at = now() - interval '1 second' where id = ${s.id}`;
    expect((await applications.submit({ ...input,applicantId: USER,draftId: draft.id })).id).toBe(results[0]!.id);
  });
  it('cleans expired private evidence and identity fields while preserving consent metadata', async () => {
    const draft = await repo.saveDraft(OTHER,input); const s = await repo.resume(OTHER,draft.id);
    await admin`update identity_verification_sessions set expires_at = now() - interval '1 second',
      data = ${admin.json({ consentVersion: 'identity-v1', consentAt: '2026-10-21', extracted: { documentNumber: 'TEST-PRIVATE' } })} where id = ${s.id}`;
    const path = `${OTHER}/expired.jpg`;
    await admin`insert into identity_evidence_uploads(path,user_id,expires_at) values (${path},${OTHER},now() - interval '1 second')`;
    const calls: string[] = [];
    const storage = supabaseVerificationEvidence('https://storage.example','server-secret', async (url, init) => {
      calls.push(String(url)); expect(init?.method).toBe('DELETE'); return new Response('{}');
    });
    await storage.cleanupExpired();
    const [row] = await admin`select status,data from identity_verification_sessions where id = ${s.id}`;
    expect(row!.status).toBe('EXPIRED'); expect(row!.data.extracted).toBeUndefined(); expect(row!.data.consentVersion).toBe('identity-v1');
    expect(calls.some(url => url.includes('/object/identity-evidence'))).toBe(true);
    expect(await admin`select path from identity_evidence_uploads where path = ${path}`).toHaveLength(0);
  });
});
