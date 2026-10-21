import { VerificationInputError } from '@/domain/verification/verification.ts';
import { verifiedDraft } from '@/infrastructure/postgres/__tests__/helpers/verified-draft.ts';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { postgresApplicationRepository } from '@/infrastructure/postgres/repositories/postgres-application.repository.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { sql, withScope } from '@/infrastructure/postgres/db.ts';
import {
  ApplicationNotFoundError,
  ApprovalConflictError,
  DuplicateApplicationError,
  NotApplicableError,
} from '@/application/ports/repositories/application-repository.port.ts';
import { InvalidTransitionError } from '@/domain/applications/application.ts';

const live = Boolean(process.env.DATABASE_URL);
const suite = live ? describe : describe.skip;

/** Long-term listings in the seed. */
const UNIT = 'b1111111-0000-0000-0000-000000000001';
const PARKING = 'b1111111-0000-0000-0000-000000000002';
/** Hybrid: let by the month AND by the night, so it does accept applications. */
const CONDO_HYBRID = 'b2222222-0000-0000-0000-000000000001';
/** Its only long-term listing is a DRAFT, so it is not on the market. */
const ROOM_UNPUBLISHED = 'b3333333-0000-0000-0000-000000000001';
const SANTOS_ORG = '11111111-1111-1111-1111-111111111111';
const SKYLINE_ORG = '22222222-2222-2222-2222-222222222222';

const APPLICANT = '77777777-7777-4777-8777-777777777777';
const OWNER = '88888888-8888-4888-8888-888888888888';
/** A second applicant, for the contested-unit case. */
const RIVAL = '66666666-6666-4666-8666-666666666666';

suite('applications against real PostgreSQL', { timeout: 30_000 }, () => {
  const realApplications = postgresApplicationRepository();
  const applications = { ...realApplications, submit: async (input: Parameters<typeof realApplications.submit>[0]) =>
    realApplications.submit({ ...input, draftId: await verifiedDraft(input) }) };
  const users = postgresUserRepository();

  beforeAll(async () => {
    for (const [id, email] of [
      [APPLICANT, 'applicant@example.test'],
      [OWNER, 'owner@example.test'],
      [RIVAL, 'rival@example.test'],
    ] as const) {
      await users.createProfile({ id, email, mobile: null });
    }
  });

  /**
   * Withdraw rather than delete: applications carry decisions, and the product
   * never removes one. WITHDRAWN is terminal, so it clears the partial unique
   * index that keeps one live application per person per place.
   */
  const reset = async () => {
    // Both organizations the tests touch: an unscoped update would match
    // nothing and report success.
    await sql.begin(async (tx) => {
      for (const organizationId of [SANTOS_ORG, SKYLINE_ORG]) {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;
        await tx`
          update occupancies set state = 'RELEASED'
           where application_id is not null and state in ('HELD','COMMITTED')
        `;
        await tx`
          update applications set state = 'WITHDRAWN'
           where applicant_id in (${APPLICANT}, ${RIVAL})
             and state in ('SUBMITTED','UNDER_REVIEW')
        `;
      }
    });
  };

  beforeEach(reset);
  afterAll(async () => {
    await reset();
    await sql.end({ timeout: 5 });
  });

  const submit = (resourceId = UNIT) =>
    applications.submit({
      resourceId,
      applicantId: APPLICANT,
      desiredMoveIn: '2027-03-01',
      desiredTermMonths: 12,
      message: 'Working at IT Park, quiet, non-smoker.',
    });

  it('submits against a published long-term listing', async () => {
    const application = await submit();

    expect(application.state).toBe('SUBMITTED');
    expect(application.organizationId).toBe(SANTOS_ORG);
  });

  it('places no hold', async () => {
    // The rule the whole feature turns on: many people may apply for one
    // place, and approval is what takes it off the market.
    const application = await submit();

    const held = await withScope(SANTOS_ORG, (tx) => tx<{ n: string }[]>`
      select count(*)::text as n from occupancies
       where resource_id = ${application.resourceId}
         and state in ('HELD','COMMITTED')
    `);
    expect(Number(held[0]!.n)).toBe(0);
  });

  it('refuses a resource with no published long-term listing', async () => {
    // Room 101's long-term listing is a draft. An application must not become
    // a way to reach inventory nobody has published (D-12), nor to apply for
    // something that is only let by the night (D-06).
    await expect(submit(ROOM_UNPUBLISHED)).rejects.toBeInstanceOf(
      VerificationInputError,
    );
  });

  it('accepts a hybrid resource, which is let by the month as well', async () => {
    // Condo 101 has both a monthly and a nightly listing over one timeline.
    // Being bookable by the night does not stop it being rentable by the month.
    const application = await submit(CONDO_HYBRID);
    expect(application.state).toBe('SUBMITTED');
  });

  it('refuses a second live application for the same place', async () => {
    await submit();
    await expect(submit()).rejects.toBeInstanceOf(DuplicateApplicationError);
  });

  it('allows applying again once the first is withdrawn', async () => {
    // Re-applying after a decision is legitimate; applying twice at once is a
    // mistake, not an intention.
    const first = await submit();
    await applications.withdraw(APPLICANT, first.id);

    const second = await submit();
    expect(second.id).not.toBe(first.id);
  });

  it('lets one person hold applications for different places', async () => {
    await submit(UNIT);
    const other = await submit(PARKING);
    expect(other.state).toBe('SUBMITTED');
  });

  describe('the applicant view', () => {
    it('carries the listing and rent the application is about', async () => {
      const application = await submit();
      const mine = await applications.forApplicantById(APPLICANT, application.id);

      expect(mine).not.toBeNull();
      expect(mine!.listingTitle).not.toBe('');
      expect(mine!.propertyName).toBe('ABC Apartment');
      expect(mine!.monthlyRentCentavos).toBeGreaterThan(0);
    });

    it('shows one applicant nothing of another\'s', async () => {
      await submit();
      const stranger = randomUUID();
      expect(await applications.forApplicant(stranger)).toEqual([]);
    });
  });

  describe('the owner decision', () => {
    it('approves, recording who and when', async () => {
      const application = await submit();
      const decided = await applications.decide({
        organizationId: SANTOS_ORG,
        applicationId: application.id,
        deciderId: OWNER,
        next: 'APPROVED',
        reason: null,
      });

      expect(decided.state).toBe('APPROVED');
      expect(decided.decidedAt).toBeInstanceOf(Date);
    });

    it('rejects with the reason the applicant will read', async () => {
      const application = await submit();
      const decided = await applications.decide({
        organizationId: SANTOS_ORG,
        applicationId: application.id,
        deciderId: OWNER,
        next: 'REJECTED',
        reason: 'Unit let to an earlier applicant',
      });

      expect(decided.state).toBe('REJECTED');
      expect(decided.decisionReason).toBe('Unit let to an earlier applicant');
    });

    it('refuses to decide twice', async () => {
      const application = await submit();
      await applications.decide({
        organizationId: SANTOS_ORG,
        applicationId: application.id,
        deciderId: OWNER,
        next: 'APPROVED',
        reason: null,
      });

      await expect(
        applications.decide({
          organizationId: SANTOS_ORG,
          applicationId: application.id,
          deciderId: OWNER,
          next: 'REJECTED',
          reason: 'Changed my mind',
        }),
      ).rejects.toBeInstanceOf(InvalidTransitionError);
    });

    it('refuses to decide an application the applicant already withdrew', async () => {
      // Withdrawn is terminal, the same as decided — an owner cannot approve
      // a place someone no longer wants, and reading the state off the
      // request the applicant already made is the guard, not a UI convention.
      const application = await submit();
      await applications.withdraw(APPLICANT, application.id);

      await expect(
        applications.decide({
          organizationId: SANTOS_ORG,
          applicationId: application.id,
          deciderId: OWNER,
          next: 'APPROVED',
          reason: null,
        }),
      ).rejects.toBeInstanceOf(InvalidTransitionError);
    });

    it('refuses to decide another organization\'s application', async () => {
      // The most consequential isolation failure available here: accepting a
      // tenant into somebody else's property.
      const application = await submit();

      await expect(
        applications.decide({
          organizationId: '33333333-3333-3333-3333-333333333333',
          applicationId: application.id,
          deciderId: OWNER,
          next: 'APPROVED',
          reason: null,
        }),
      ).rejects.toBeInstanceOf(ApplicationNotFoundError);
    });
  });

  describe('approval takes the place off the market', () => {
    it('places a hold even when no fee was paid', async () => {
      // entities.md: an application holds nothing, and approval is the act
      // that removes the resource from sale. Without this the owner screen
      // promised a hold the database never placed, and the unit stayed
      // rentable by somebody else.
      const application = await submit();

      await applications.decide({
        organizationId: SANTOS_ORG,
        applicationId: application.id,
        deciderId: OWNER,
        next: 'APPROVED',
        reason: null,
      });

      const held = await withScope(SANTOS_ORG, (tx) => tx<
        { kind: string; state: string; expires_at: Date | null }[]
      >`
        select kind, state, expires_at from occupancies
         where application_id = ${application.id}
      `);

      expect(held).toHaveLength(1);
      expect(held[0]).toMatchObject({ kind: 'LEASE', state: 'HELD' });
      expect(held[0]!.expires_at).toBeInstanceOf(Date);
    });

    it('surfaces the deadline to the applicant', async () => {
      const application = await submit();
      await applications.decide({
        organizationId: SANTOS_ORG,
        applicationId: application.id,
        deciderId: OWNER,
        next: 'APPROVED',
        reason: null,
      });

      const detail = await applications.forApplicantById(APPLICANT, application.id);
      expect(detail!.holdExpiresAt).toBeInstanceOf(Date);
    });

    it('places no hold on rejection', async () => {
      const application = await submit();
      await applications.decide({
        organizationId: SANTOS_ORG,
        applicationId: application.id,
        deciderId: OWNER,
        next: 'REJECTED',
        reason: 'Let to an earlier applicant',
      });

      const held = await withScope(SANTOS_ORG, (tx) => tx<{ n: string }[]>`
        select count(*)::text as n from occupancies
         where application_id = ${application.id} and state = 'HELD'
      `);
      expect(Number(held[0]!.n)).toBe(0);
    });

    it('refuses an approval that would double-book the place', async () => {
      // Two people applied for the same unit and the owner tried to approve
      // both. The second must fail loudly at decision time, not be discovered
      // when the tenant arrives.
      const first = await submit();
      await applications.decide({
        organizationId: SANTOS_ORG,
        applicationId: first.id,
        deciderId: OWNER,
        next: 'APPROVED',
        reason: null,
      });

      const second = await applications.submit({
        resourceId: UNIT,
        applicantId: RIVAL,
        desiredMoveIn: '2027-03-01',
        desiredTermMonths: 12,
        message: '',
      });

      await expect(
        applications.decide({
          organizationId: SANTOS_ORG,
          applicationId: second.id,
          deciderId: OWNER,
          next: 'APPROVED',
          reason: null,
        }),
      ).rejects.toBeInstanceOf(ApprovalConflictError);
    });
  });

  describe('documents', () => {
    it('records an attachment against an open application', async () => {
      const application = await submit();
      const doc = await applications.attachDocument({
        applicantId: APPLICANT,
        applicationId: application.id,
        kind: 'GOVERNMENT_ID',
        storagePath: `${SANTOS_ORG}/${application.id}/${randomUUID()}-id.jpg`,
        fileName: 'id.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 120_000,
      });

      expect(doc.kind).toBe('GOVERNMENT_ID');

      const detail = await applications.forApplicantById(APPLICANT, application.id);
      expect(detail!.documents).toHaveLength(1);
      // Only the path is stored. The bytes are behind a signed URL.
      expect(detail!.documents[0]!.storagePath).toContain(application.id);
    });

    it('refuses an attachment after a decision', async () => {
      // Attaching evidence to a decided application changes the record the
      // decision was made on.
      const application = await submit();
      await applications.decide({
        organizationId: SANTOS_ORG,
        applicationId: application.id,
        deciderId: OWNER,
        next: 'APPROVED',
        reason: null,
      });

      await expect(
        applications.attachDocument({
          applicantId: APPLICANT,
          applicationId: application.id,
          kind: 'OTHER',
          storagePath: `${SANTOS_ORG}/${application.id}/${randomUUID()}-late.pdf`,
          fileName: 'late.pdf',
          contentType: 'application/pdf',
          sizeBytes: 1000,
        }),
      ).rejects.toBeInstanceOf(NotApplicableError);
    });

    it('refuses an attachment from somebody else', async () => {
      const application = await submit();

      await expect(
        applications.attachDocument({
          applicantId: randomUUID(),
          applicationId: application.id,
          kind: 'OTHER',
          storagePath: `x/${randomUUID()}.pdf`,
          fileName: 'x.pdf',
          contentType: 'application/pdf',
          sizeBytes: 10,
        }),
      ).rejects.toBeInstanceOf(ApplicationNotFoundError);
    });
  });
});
