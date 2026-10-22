import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
import { loadRentalApplicationPolicy } from '@/infrastructure/postgres/repositories/rental-application-policy.repository.ts';
import { assertApplicationPolicy, VerificationRateLimitError, VerificationConflictError, VerificationNotFoundError, type ApplicationDraft, type VerificationSession } from '@/domain/verification/verification.ts';
import { withUser } from '@/infrastructure/postgres/db.ts';

interface DraftRow {
  id: string; user_id: string; resource_id: string; desired_move_in: string;
  desired_term_months: number; occupants: number; message: string; application_id: string | null;
}
interface SessionRow {
  id: string; user_id: string; draft_id: string; version: number;
  status: VerificationSession['status']; expires_at: Date; data: Partial<VerificationSession>;
}
const draft = (r: DraftRow): ApplicationDraft => ({ id: r.id, userId: r.user_id, resourceId: r.resource_id,
  desiredMoveIn: r.desired_move_in.slice(0, 10), desiredTermMonths: r.desired_term_months,
  occupants: r.occupants, message: r.message, applicationId: r.application_id });
const session = (r: SessionRow): VerificationSession => ({
  consentAt: null, consentVersion: null, captureId: null, extracted: null, confidence: null,
  reviewed: null, challenge: null, failure: null, frontPath: null, evidence: [], ...r.data,
  id: r.id, userId: r.user_id, draftId: r.draft_id, version: r.version,
  status: r.status, expiresAt: r.expires_at.toISOString(),
});

export function postgresVerificationRepository(): VerificationRepository {
  return {
    async admitCapture(userId) {
      await withUser(userId, async tx => {
        const [row] = await tx<{ attempts: number }[]>`insert into identity_capture_limits(user_id, window_start, attempts)
          values (${userId}, date_trunc('minute', now()), 1)
          on conflict (user_id) do update set
            attempts = case when identity_capture_limits.window_start < date_trunc('minute', now()) then 1 else identity_capture_limits.attempts + 1 end,
            window_start = date_trunc('minute', now()) returning attempts`;
        if (row!.attempts > 10) throw new VerificationRateLimitError('Too many captures. Wait a minute and try again.');
      });
    },
    async saveDraft(userId, input) {
      return withUser(userId, async tx => {
        assertApplicationPolicy(input, await loadRentalApplicationPolicy(tx, input.resourceId));
        const [row] = await tx<DraftRow[]>`
          insert into application_drafts(user_id, resource_id, desired_move_in, desired_term_months, occupants, message)
          values (${userId}, ${input.resourceId}, ${input.desiredMoveIn}::date, ${input.desiredTermMonths}, ${input.occupants}, ${input.message})
          on conflict (user_id, resource_id) where application_id is null do update set
            desired_move_in = excluded.desired_move_in, desired_term_months = excluded.desired_term_months,
            occupants = excluded.occupants, message = excluded.message, updated_at = now()
          returning *, to_char(desired_move_in, 'YYYY-MM-DD') as desired_move_in
        `;
        return draft(row!);
      });
    },
    async findDraft(userId, resourceId) {
      return withUser(userId, async tx => {
        const [row] = await tx<DraftRow[]>`select d.*, to_char(d.desired_move_in, 'YYYY-MM-DD') as desired_move_in
          from application_drafts d left join applications a on a.id = d.application_id
          where d.user_id = ${userId} and d.resource_id = ${resourceId}
            and (d.application_id is null or a.state in ('SUBMITTED','UNDER_REVIEW','APPROVED'))
          order by (d.application_id is null) desc, d.updated_at desc limit 1`;
        return row ? draft(row) : null;
      });
    },
    async draftById(userId, draftId) {
      return withUser(userId, async tx => {
        const [row] = await tx<DraftRow[]>`select *, to_char(desired_move_in, 'YYYY-MM-DD') as desired_move_in
          from application_drafts where id = ${draftId} and user_id = ${userId}`;
        if (!row) throw new VerificationNotFoundError('No such application draft.');
        return draft(row);
      });
    },
    async resume(userId, draftId) {
      return withUser(userId, async tx => {
        const [owned] = await tx`select id from application_drafts where id = ${draftId}
          and user_id = ${userId} and application_id is null for update`;
        if (!owned) throw new VerificationNotFoundError('No open application draft.');
        const [active] = await tx<SessionRow[]>`select * from identity_verification_sessions
          where draft_id = ${draftId} and user_id = ${userId} and status not in ('EXPIRED','CANCELLED')
            and expires_at > now()
            and (status <> 'VERIFIED' or data->'review'->>'approved' is distinct from 'true' or (data->'review'->>'validUntil')::timestamptz > now())`;
        if (active) return session(active);
        await tx`update identity_verification_sessions set status = 'EXPIRED', version = version + 1,
          data = jsonb_build_object('consentAt', data->'consentAt', 'consentVersion', data->'consentVersion', 'review', data->'review')
          where draft_id = ${draftId} and user_id = ${userId} and (expires_at <= now() or
            (status = 'VERIFIED' and data->'review'->>'approved' = 'true' and coalesce((data->'review'->>'validUntil')::timestamptz, '-infinity'::timestamptz) <= now()))
            and status <> 'EXPIRED'`;
        const [reusable] = await tx<SessionRow[]>`select * from identity_verification_sessions
          where user_id = ${userId} and ((status = 'VERIFIED' and expires_at > now()
              and (data->'review'->>'approved' is distinct from 'true' or (data->'review'->>'validUntil')::timestamptz > now()))
            or (data->'review'->>'approved' = 'true' and (data->'review'->>'validUntil')::timestamptz > now()))
          order by expires_at desc limit 1 for share`;
        const [row] = await tx<SessionRow[]>`insert into identity_verification_sessions(user_id,draft_id,status,expires_at,data)
          values (${userId},${draftId},${reusable ? 'VERIFIED' : 'CONSENT_REQUIRED'},
            ${new Date(Math.min(Date.now() + 30 * 60_000, reusable?.data.review?.validUntil ? Date.parse(reusable.data.review.validUntil) : reusable ? new Date(reusable.expires_at).getTime() : Infinity))},
            ${tx.json(reusable ? { consentAt: reusable.data.consentAt ?? null, consentVersion: reusable.data.consentVersion ?? null, review: reusable.data.review ?? null } : {})}) returning *`;
        return session(row!);
      });
    },
    async get(userId, sessionId) {
      return withUser(userId, async tx => {
        const [row] = await tx<SessionRow[]>`select * from identity_verification_sessions
          where id = ${sessionId} and user_id = ${userId}`;
        if (!row) throw new VerificationNotFoundError('No such verification.');
        const value = session(row);
        return new Date(value.expiresAt) <= new Date() || (value.review?.approved === true && (!value.review.validUntil || Date.parse(value.review.validUntil) <= Date.now())) ? {
          ...value, status: 'EXPIRED', extracted: null, reviewed: null, confidence: null, challenge: null,
        } : value;
      });
    },
    async save(value, expectedVersion) {
      return withUser(value.userId, async tx => {
        const [draft] = await tx`select id from application_drafts where id = ${value.draftId}
          and user_id = ${value.userId} and (application_id is null or ${value.review != null}) for update`;
        if (!draft) throw new VerificationConflictError('This application has already been submitted.');
        const data = { consentAt: value.consentAt, consentVersion: value.consentVersion,
          captureId: value.captureId, frontPath: value.frontPath, evidence: value.evidence,
          extracted: value.extracted, confidence: value.confidence, reviewed: value.reviewed,
          challenge: value.challenge, failure: value.failure, review: value.review ?? null };
        const [row] = await tx<SessionRow[]>`update identity_verification_sessions
          set status = ${value.status}, data = ${tx.json(JSON.parse(JSON.stringify(data)))}, version = version + 1
          where id = ${value.id} and user_id = ${value.userId} and version = ${expectedVersion}
            and expires_at > now()
            and exists (select 1 from application_drafts d where d.id = draft_id and (d.application_id is null or (identity_verification_sessions.status = 'MANUAL_REVIEW' and ${value.review != null})))
          returning *`;
        if (!row) throw new VerificationConflictError('Verification changed. Refresh before continuing.');
        return session(row);
      });
    },
  };
}
