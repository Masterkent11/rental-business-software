import { createHash } from 'node:crypto';
import type { VerificationEvidenceStorage } from '@/application/ports/storage/verification-evidence.port.ts';
import { VerificationUnavailableError } from '@/domain/verification/verification.ts';
import { sql, withUser } from '@/infrastructure/postgres/db.ts';
const BUCKET = 'identity-evidence';
export function supabaseVerificationEvidence(
  base = process.env.SUPABASE_URL ?? '', key = process.env.SUPABASE_SERVICE_KEY ?? '',
  fetchImpl: typeof fetch = fetch,
): VerificationEvidenceStorage {
  const request = async (path: string, method: string, body: Uint8Array | string, contentType: string) => {
    if (!base || !key) throw new VerificationUnavailableError('Secure identity storage is unavailable. Please try again later.');
    let response: Response;
    try {
      response = await fetchImpl(`${base.replace(/\/$/, '')}/storage/v1${path}`, {
        method, headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': contentType,
          'cache-control': 'no-store', 'x-upsert': 'false' }, body,
        signal: AbortSignal.timeout(15_000),
      });
    } catch { throw new VerificationUnavailableError('Secure identity storage is unavailable. Please try again later.'); }
    if (!response.ok && !(method === 'POST' && response.status === 409) && !(method === 'DELETE' && response.status === 404)) throw new VerificationUnavailableError('Secure identity storage is unavailable. Please try again later.');
    return response;
  };
  const remove = async (userId: string, paths: readonly string[]) => {
    if (!paths.length) return;
    if (paths.some(path => !path.startsWith(`${userId}/`))) throw new Error('Evidence ownership mismatch');
    await request(`/object/${BUCKET}`, 'DELETE', JSON.stringify({ prefixes: paths }), 'application/json');
    await withUser(userId, tx => tx`delete from identity_evidence_uploads where user_id = ${userId} and path in ${tx(paths)}`);
  };
  return {
    async put(input) {
      const digest = createHash('sha256').update(input.bytes).digest('hex');
      const path = `${input.userId}/${input.sessionId}/${input.captureId}/${input.evidenceId}-${digest}.jpg`;
      await withUser(input.userId, tx => tx`insert into identity_evidence_uploads(path, user_id, expires_at)
        values (${path}, ${input.userId}, ${input.expiresAt}::timestamptz) on conflict (path) do nothing`);
      await request(`/object/${BUCKET}/${path}`, 'POST', input.bytes, 'image/jpeg');
      return path;
    },
    remove,
    async reviewUrl(userId, path, expiresInSeconds) {
      if (!path.startsWith(`${userId}/`) || path.split('/').some(segment => segment === '..') || expiresInSeconds < 1 || expiresInSeconds > 60) {
        throw new VerificationUnavailableError('Private review evidence is unavailable.');
      }
      const response = await request(`/object/sign/${BUCKET}/${path}`, 'POST', JSON.stringify({ expiresIn: expiresInSeconds }), 'application/json');
      const body = await response.json() as { signedURL?: string };
      if (!body.signedURL?.startsWith(`/object/sign/${BUCKET}/`)) throw new VerificationUnavailableError('Private review evidence is unavailable.');
      return `${base.replace(/\/$/, '')}/storage/v1${body.signedURL}`;
    },
    async cleanupExpired() {
      const rows = await sql.begin(async tx => {
        await tx`select set_config('app.identity_cleanup', 'true', true)`;
        await tx`update identity_verification_sessions set status = 'EXPIRED', version = version + 1,
          data = jsonb_build_object('consentAt', data->'consentAt', 'consentVersion', data->'consentVersion', 'review', data->'review')
          where expires_at <= now() and (status <> 'EXPIRED' or data - 'consentAt' - 'consentVersion' - 'review' <> '{}'::jsonb)`;
        return tx<{ path: string; user_id: string }[]>`select path, user_id from identity_evidence_uploads
          where expires_at <= now() order by expires_at limit 100`;
      });
      for (const row of rows) await remove(row.user_id, [row.path]);
    },
  };
}
