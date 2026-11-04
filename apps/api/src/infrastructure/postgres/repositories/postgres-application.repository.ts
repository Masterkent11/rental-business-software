import { loadRentalApplicationPolicy } from '@/infrastructure/postgres/repositories/rental-application-policy.repository.ts';
import { assertApplicationPolicy, validateApplicationDraft, VerificationRequiredError, VerificationConflictError } from '@/domain/verification/verification.ts';
import type postgres from 'postgres';
import { sql } from '@/infrastructure/postgres/db.ts';
import {
  AlreadyReservedError,
  ApplicationNotFoundError,
  ApprovalConflictError,
  DuplicateApplicationError,
  NotApplicableError,
  ReservationNotOfferedError,
  type ApplicationDetail,
  type ApplicationDocument,
  type ApplicationRepository,
} from '@/application/ports/repositories/application-repository.port.ts';
import {
  APPROVAL_HOLD_HOURS,
  applicationMessageWithOccupants,
  assertApplicantMayWithdraw,
  assertApplicationDocumentPath,
  assertOwnerMayDecide,
  ledgerTypeFor,
  outcomeFor,
  type Application,
  type ApplicationState,
  type DocumentKind,
  type Reservation,
} from '@/domain/applications/application.ts';
import { centavos } from '@/domain/shared/money.ts';

const UNIQUE_VIOLATION = '23505';
const EXCLUSION_VIOLATION = '23P01';

interface ApplicationRow {
  id: string;
  organization_id: string;
  resource_id: string;
  applicant_id: string;
  desired_move_in: string;
  desired_term_months: number;
  message: string;
  state: ApplicationState;
  decision_reason: string | null;
  decided_at: Date | null;
  created_at: Date;
}

const toApplication = (row: ApplicationRow): Application => ({
  id: row.id,
  organizationId: row.organization_id,
  resourceId: row.resource_id,
  applicantId: row.applicant_id,
  desiredMoveIn: row.desired_move_in,
  desiredTermMonths: row.desired_term_months,
  message: row.message,
  state: row.state,
  decisionReason: row.decision_reason,
  decidedAt: row.decided_at,
  createdAt: row.created_at,
});

type DetailRow = ApplicationRow & {
  listing_title: string;
  property_name: string;
  area_label: string;
  city_label: string;
  monthly_rent_centavos: string;
  reference: string;
  photo: string | null;
  move_in_cost_centavos: string;
};

export function postgresApplicationRepository(): ApplicationRepository {
  return {
    async submit(input) {
      try {
        return await sql.begin(async (tx) => {
          await tx`select set_config('app.user_id', ${input.applicantId}, true)`;

          if (!input.draftId) throw new VerificationRequiredError('Verify your identity before submitting.');
          const [draft] = await tx<{
            id: string; resource_id: string; desired_move_in: string; desired_term_months: number;
            occupants: number; message: string; application_id: string | null;
          }[]>`select *, to_char(desired_move_in, 'YYYY-MM-DD') as desired_move_in from application_drafts
            where id = ${input.draftId} and user_id = ${input.applicantId} for update`;
          if (!draft || draft.resource_id !== input.resourceId) throw new VerificationRequiredError('No verified application draft.');
          if (draft.application_id) {
            const [existing] = await tx<ApplicationRow[]>`select *, to_char(desired_move_in, 'YYYY-MM-DD') as desired_move_in
              from applications where id = ${draft.application_id} and applicant_id = ${input.applicantId}`;
            if (existing) return toApplication(existing);
          }
          if (draft.desired_move_in !== input.desiredMoveIn || draft.desired_term_months !== input.desiredTermMonths || draft.message !== input.message) {
            throw new VerificationConflictError('Your application details changed. Review them again.');
          }
          validateApplicationDraft({ ...input, occupants: draft.occupants }, new Date());
          const policy = await loadRentalApplicationPolicy(tx, input.resourceId);
          assertApplicationPolicy({ ...input, occupants: draft.occupants }, policy);
          const [verification] = await tx`select id from identity_verification_sessions
            where draft_id = ${draft.id} and user_id = ${input.applicantId} and ((status = 'VERIFIED' and (data->'review'->>'approved' is distinct from 'true' or (data->'review'->>'validUntil')::timestamptz > now())) or (status = 'MANUAL_REVIEW' and ${policy!.allowPendingIdentityApplication}))
              and expires_at > now() for update`;
          if (!verification) throw new VerificationRequiredError('Complete identity verification before submitting.');

          const resource = { organization_id: policy!.organizationId };

          await tx`select set_config('app.organization_id', ${resource.organization_id}, true)`;

          const [row] = await tx<ApplicationRow[]>`
            insert into applications (
              organization_id, resource_id, applicant_id,
              desired_move_in, desired_term_months, message
            ) values (
              ${resource.organization_id}, ${input.resourceId}, ${input.applicantId},
              ${input.desiredMoveIn}::date, ${input.desiredTermMonths}, ${applicationMessageWithOccupants(input.message, draft.occupants)}
            )
            returning id, organization_id, resource_id, applicant_id,
                      to_char(desired_move_in, 'YYYY-MM-DD') as desired_move_in,
                      desired_term_months, message, state, decision_reason,
                      decided_at, created_at
          `;
          await tx`update application_drafts set application_id = ${row!.id}, updated_at = now() where id = ${draft.id}`;
          await tx`insert into notifications(organization_id, kind, title, body, link)
            values (${resource.organization_id}, 'APPLICATION_RECEIVED', 'New rental application',
              'A customer submitted an application.', ${'/applications/' + row!.id})`;
          return toApplication(row!);
        }) as Application;
      } catch (error) {
        if ((error as postgres.PostgresError).code === UNIQUE_VIOLATION) {
          // The partial unique index only covers live applications, so this
          // means "you already have one open for this place" — not "you may
          // never apply again".
          throw new DuplicateApplicationError(
            'You already have an application open for this place',
          );
        }
        throw error;
      }
    },

    async forApplicant(applicantId) {
      return detailsFor(applicantId, null, null);
    },

    async forApplicantById(applicantId, applicationId) {
      const rows = await detailsFor(applicantId, null, applicationId);
      return rows[0] ?? null;
    },

    async forOrganization(organizationId) {
      return detailsFor(null, organizationId, null);
    },

    async withdraw(applicantId, applicationId) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.user_id', ${applicantId}, true)`;

        const [scope] = await tx<{ organization_id: string }[]>`
          select organization_id from applications where id = ${applicationId} and applicant_id = ${applicantId}
        `;
        if (!scope) throw new ApplicationNotFoundError('No such application');
        await tx`select set_config('app.organization_id', ${scope.organization_id}, true)`;

        const [current] = await tx<ApplicationRow[]>`
          select id, organization_id, resource_id, applicant_id,
                 to_char(desired_move_in, 'YYYY-MM-DD') as desired_move_in,
                 desired_term_months, message, state, decision_reason,
                 decided_at, created_at
            from applications
           where id = ${applicationId} and applicant_id = ${applicantId} for update
        `;
        if (!current) throw new ApplicationNotFoundError('No such application');

        assertApplicantMayWithdraw(current.state);

        const [row] = await tx<ApplicationRow[]>`
          update applications set state = 'WITHDRAWN'
           where id = ${applicationId}
          returning id, organization_id, resource_id, applicant_id,
                    to_char(desired_move_in, 'YYYY-MM-DD') as desired_move_in,
                    desired_term_months, message, state, decision_reason,
                    decided_at, created_at
        `;

        // Withdrawing forfeits the fee: the resource was held off the market
        // for this person, and the owner carried that cost.
        await settleReservation(tx, applicationId, outcomeFor('WITHDRAWN'));

        return toApplication(row!);
      }) as Promise<Application>;
    },

    async decide({ organizationId, applicationId, deciderId, next, reason }) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;

        const [current] = await tx<ApplicationRow[]>`
          select id, organization_id, resource_id, applicant_id,
                 to_char(desired_move_in, 'YYYY-MM-DD') as desired_move_in,
                 desired_term_months, message, state, decision_reason,
                 decided_at, created_at
            from applications
           where id = ${applicationId} and organization_id = ${organizationId} for update
        `;
        if (!current) throw new ApplicationNotFoundError('No such application');

        assertOwnerMayDecide(current.state, next);

        if (next === 'APPROVED') {
          const [context] = await tx<{ actor: string }[]>`select coalesce(current_setting('app.user_id', true), '') as actor`;
          await tx`select set_config('app.user_id', ${current.applicant_id}, true)`;
          const [identity] = await tx`select 1 from application_drafts d
            join identity_verification_sessions s on s.draft_id = d.id and s.user_id = d.user_id
            where d.application_id = ${applicationId} and (
              (s.status = 'VERIFIED' and s.expires_at > now()
                and (s.data->'review'->>'approved' is distinct from 'true' or (s.data->'review'->>'validUntil')::timestamptz > now())) or
              (s.data->'review'->>'approved' = 'true' and (s.data->'review'->>'validUntil')::timestamptz > now()))`;
          await tx`select set_config('app.user_id', ${context!.actor}, true)`;
          if (!identity) throw new VerificationRequiredError('The applicant must complete identity verification before approval.');
        }
        const decided = next === 'APPROVED' || next === 'REJECTED';
        const [row] = await tx<ApplicationRow[]>`
          update applications
             set state = ${next},
                 decision_reason = ${reason},
                 decided_by = ${decided ? deciderId : null},
                 decided_at = ${decided ? sql`now()` : null}
           where id = ${applicationId}
          returning id, organization_id, resource_id, applicant_id,
                    to_char(desired_move_in, 'YYYY-MM-DD') as desired_move_in,
                    desired_term_months, message, state, decision_reason,
                    decided_at, created_at
        `;

        // The fee is settled in the same transaction as the decision. A
        // decision that leaves the money in limbo is the state customers chase
        // support about.
        if (next === 'APPROVED' || next === 'REJECTED') {
          await settleReservation(tx, applicationId, outcomeFor(next));
        }

        if (next === 'APPROVED') {
          await placeApprovalHold(tx, {
            applicationId,
            organizationId,
            resourceId: current.resource_id,
            desiredMoveIn: current.desired_move_in,
            termMonths: current.desired_term_months,
            applicantId: current.applicant_id,
          });
        }

        return toApplication(row!);
      }) as Promise<Application>;
    },

    async attachDocument(input) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.user_id', ${input.applicantId}, true)`;

        const [app] = await tx<{ organization_id: string; state: ApplicationState }[]>`
          select organization_id, state from applications
           where id = ${input.applicationId} and applicant_id = ${input.applicantId}
        `;
        if (!app) throw new ApplicationNotFoundError('No such application');
        assertApplicationDocumentPath(input.storagePath, app.organization_id, input.applicationId);
        await tx`select set_config('app.organization_id', ${app.organization_id}, true)`;
        const [current] = await tx<{ state: ApplicationState }[]>`
          select state from applications where id = ${input.applicationId} and applicant_id = ${input.applicantId} for update
        `;
        if (!current || (current.state !== 'SUBMITTED' && current.state !== 'UNDER_REVIEW')) {
          // Attaching evidence to a decided application would change the
          // record the decision was made on.
          throw new NotApplicableError('This application has already been decided');
        }

        const [row] = await tx<
          {
            id: string;
            kind: DocumentKind;
            file_name: string;
            content_type: string;
            size_bytes: string;
            storage_path: string;
            uploaded_at: Date;
          }[]
        >`
          insert into application_documents (
            organization_id, application_id, kind, storage_path,
            file_name, content_type, size_bytes
          ) values (
            ${app.organization_id}, ${input.applicationId}, ${input.kind},
            ${input.storagePath}, ${input.fileName}, ${input.contentType},
            ${input.sizeBytes}
          )
          returning id, kind, file_name, content_type, size_bytes::text,
                    storage_path, uploaded_at
        `;

        return {
          id: row!.id,
          kind: row!.kind,
          fileName: row!.file_name,
          contentType: row!.content_type,
          sizeBytes: Number(row!.size_bytes),
          storagePath: row!.storage_path,
          uploadedAt: row!.uploaded_at,
        } satisfies ApplicationDocument;
      }) as Promise<ApplicationDocument>;
    },

    async reserve({ applicantId, applicationId, holdMinutes }) {
      return sql.begin(async (tx) => {
        await tx`select set_config('app.user_id', ${applicantId}, true)`;

        const [app] = await tx<
          {
            organization_id: string;
            resource_id: string;
            desired_move_in: string;
            desired_term_months: number;
            state: ApplicationState;
            fee: string | null;
          }[]
        >`
          select a.organization_id, a.resource_id,
                 to_char(a.desired_move_in, 'YYYY-MM-DD') as desired_move_in,
                 a.desired_term_months, a.state,
                 l.reservation_fee_centavos::text as fee
            from applications a
            join listings l
              on l.resource_id = a.resource_id
             and l.kind = 'LONG_TERM'
             and l.state = 'PUBLISHED'
           where a.id = ${applicationId} and a.applicant_id = ${applicantId}
        `;
        if (!app) throw new ApplicationNotFoundError('No such application');
        await tx`select set_config('app.organization_id', ${app.organization_id}, true)`;
        const [current] = await tx<{ state: ApplicationState }[]>`
          select state from applications where id = ${applicationId} and applicant_id = ${applicantId} for update
        `;
        if (!current) throw new ApplicationNotFoundError('No such application');
        if (current.state !== 'SUBMITTED' && current.state !== 'UNDER_REVIEW') {
          throw new NotApplicableError('This application has already been decided');
        }
        if (!app.fee) {
          // Reservations are opt-in. Inventing a fee would be the platform
          // pricing — and later forfeiting — the owner's inventory for them.
          throw new ReservationNotOfferedError(
            'This owner does not offer reservations on this place',
          );
        }


        const [existing] = await tx<{ id: string }[]>`
          select id from reservations
           where application_id = ${applicationId}
             and state in ('PENDING_PAYMENT','ACTIVE')
        `;
        if (existing) {
          throw new AlreadyReservedError('This application is already reserved');
        }

        // The hold covers the tenancy the applicant asked for. A reservation
        // that only blocked a token day would not actually reserve anything.
        const [occupancy] = await tx<{ id: string }[]>`
          insert into occupancies (
            organization_id, resource_id, root_id, subtree,
            during, kind, state, expires_at, held_by, application_id
          )
          select r.organization_id, r.id, r.root_id, r.subtree,
                 daterange(
                   ${app.desired_move_in}::date,
                   (${app.desired_move_in}::date
                     + (${app.desired_term_months} || ' months')::interval)::date,
                   '[)'),
                 'RESERVATION', 'HELD',
                 now() + (${holdMinutes} || ' minutes')::interval,
                 ${applicantId}, ${applicationId}
            from rentable_resources r
           where r.id = ${app.resource_id}
          returning id
        `;

        const [reservation] = await tx<
          {
            id: string;
            organization_id: string;
            occupancy_id: string;
            fee_centavos: string;
            state: Reservation['state'];
            expires_at: Date | null;
          }[]
        >`
          insert into reservations (
            organization_id, application_id, occupancy_id, fee_centavos, state
          ) values (
            ${app.organization_id}, ${applicationId}, ${occupancy!.id},
            ${centavos(Number(app.fee))}, 'PENDING_PAYMENT'
          )
          returning id, organization_id, occupancy_id, fee_centavos::text,
                    state, expires_at
        `;

        return {
          id: reservation!.id,
          organizationId: reservation!.organization_id,
          applicationId,
          occupancyId: reservation!.occupancy_id,
          feeCentavos: centavos(Number(reservation!.fee_centavos)),
          state: reservation!.state,
          expiresAt: reservation!.expires_at,
        } satisfies Reservation;
      }) as Promise<Reservation>;
    },

    async resolveReservation({ applicationId, outcome }) {
      await sql.begin(async (tx) => {
        const [reservation] = await tx<{ organization_id: string }[]>`
          select organization_id from reservations
           where application_id = ${applicationId}
        `;
        if (!reservation) return;
        await tx`select set_config('app.organization_id', ${reservation.organization_id}, true)`;
        await settleReservation(tx, applicationId, outcome);
      });
    },
  };
}

/**
 * Approval is what takes the place off the market.
 *
 * entities.md is explicit that an application holds nothing and approval does.
 * A reservation already holds it — that occupancy is committed by
 * `settleReservation` — so this covers the ordinary case where the applicant
 * paid no fee and the owner simply said yes.
 *
 * The exclusion constraint is what makes the refusal trustworthy: if the term
 * overlaps an existing booking or lease, the approval fails rather than
 * quietly double-selling the place.
 */
async function placeApprovalHold(
  tx: postgres.TransactionSql,
  input: {
    applicationId: string;
    organizationId: string;
    resourceId: string;
    desiredMoveIn: string;
    termMonths: number;
    applicantId: string;
  },
): Promise<void> {
  const [existing] = await tx<{ id: string }[]>`
    select id from occupancies
     where application_id = ${input.applicationId}
       and state in ('HELD', 'COMMITTED')
  `;
  // A paid reservation already holds it; committing that is not this function's
  // job, and placing a second hold would collide with the first.
  if (existing) return;

  try {
    await tx`
      insert into occupancies (
        organization_id, resource_id, root_id, subtree,
        during, kind, state, expires_at, held_by, application_id
      )
      select r.organization_id, r.id, r.root_id, r.subtree,
             daterange(
               ${input.desiredMoveIn}::date,
               (${input.desiredMoveIn}::date
                 + (${input.termMonths} || ' months')::interval)::date,
               '[)'),
             'LEASE', 'HELD',
             now() + (${APPROVAL_HOLD_HOURS} || ' hours')::interval,
             ${input.applicantId}, ${input.applicationId}
        from rentable_resources r
       where r.id = ${input.resourceId}
    `;
  } catch (error) {
    if ((error as postgres.PostgresError).code === EXCLUSION_VIOLATION) {
      throw new ApprovalConflictError(
        'Those dates are already taken for this place',
      );
    }
    throw error;
  }
}

/**
 * Apply a fee outcome to both the reservation and the ledger.
 *
 * Releasing the occupancy matters as much as the money: a resource still held
 * for a rejected applicant is inventory nobody can sell and nobody is paying
 * for.
 */
async function settleReservation(
  tx: postgres.TransactionSql,
  applicationId: string,
  outcome: 'CREDITED' | 'REFUNDED' | 'FORFEITED',
): Promise<void> {
  const [reservation] = await tx<
    {
      id: string;
      organization_id: string;
      occupancy_id: string | null;
      payment_id: string | null;
      fee_centavos: string;
      state: string;
    }[]
  >`
    select id, organization_id, occupancy_id, payment_id,
           fee_centavos::text, state
      from reservations
     where application_id = ${applicationId}
       and state in ('PENDING_PAYMENT','ACTIVE')
     for update
  `;
  if (!reservation) return;

  // An unpaid reservation has no money to settle — but it does have a hold,
  // and leaving it in place keeps the resource off the market for a
  // reservation that is already over.
  if (reservation.state === 'PENDING_PAYMENT') {
    await tx`
      update reservations set state = 'EXPIRED', resolved_at = now()
       where id = ${reservation.id}
    `;
    if (reservation.occupancy_id) {
      await tx`
        update occupancies set state = 'RELEASED'
         where id = ${reservation.occupancy_id}
      `;
    }
    return;
  }

  await tx`
    update reservations
       set state = ${outcome}, resolved_at = now()
     where id = ${reservation.id}
  `;

  if (reservation.occupancy_id) {
    // Credited means the place is theirs and the hold stays until the lease
    // replaces it (Sprint 6). The other two outcomes put it back on the market.
    const nextOccupancy = outcome === 'CREDITED' ? 'COMMITTED' : 'RELEASED';
    await tx`
      update occupancies set state = ${nextOccupancy}
       where id = ${reservation.occupancy_id}
    `;
  }

  await tx`
    insert into ledger_entries (
      organization_id, entry_type, amount_centavos, origin,
      actor_type, actor_id, cause_type, cause_id, occurred_at
    ) values (
      ${reservation.organization_id}, ${ledgerTypeFor(outcome)},
      ${Number(reservation.fee_centavos)}, 'ONLINE',
      'SYSTEM', 'reservation-outcome', 'RESERVATION', ${reservation.id}, now()
    )
  `;
}

/** Shared read for the applicant view and the owner view. */
async function detailsFor(
  applicantId: string | null,
  organizationId: string | null,
  applicationId: string | null,
): Promise<readonly ApplicationDetail[]> {
  const run = async (tx: postgres.TransactionSql) => {
    if (applicantId) {
      await tx`select set_config('app.user_id', ${applicantId}, true)`;
    }
    if (organizationId) {
      await tx`select set_config('app.organization_id', ${organizationId}, true)`;
    }

    const rows = await tx<DetailRow[]>`
      select a.id, a.organization_id, a.resource_id, a.applicant_id,
             to_char(a.desired_move_in, 'YYYY-MM-DD') as desired_move_in,
             a.desired_term_months, a.message, a.state, a.decision_reason,
             a.decided_at, a.created_at,
             l.title as listing_title,
             p.name as property_name,
             p.area_label, p.city_label,
             l.price_centavos::text as monthly_rent_centavos,
             upper(substring(replace(a.id::text, '-', '') from 1 for 8)) as reference,
             (select m.storage_url from media_assets m
               where m.listing_id = l.id order by m.position limit 1) as photo,
             -- First month plus advance plus deposit: what it actually costs to
             -- get in the door, computed here so no client invents it.
             (l.price_centavos * (1 + l.advance_months + l.deposit_months))::text
               as move_in_cost_centavos
        from applications a
        join rentable_resources r on r.id = a.resource_id
        join properties p on p.id = r.property_id
        join listings l
          on l.resource_id = r.id and l.kind = 'LONG_TERM'
       where (${applicantId}::uuid is null or a.applicant_id = ${applicantId})
         and (${organizationId}::uuid is null or a.organization_id = ${organizationId})
         and (${applicationId}::uuid is null or a.id = ${applicationId})
       order by a.created_at desc
    `;
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);

    const documents = await tx<
      {
        application_id: string;
        id: string;
        kind: DocumentKind;
        file_name: string;
        content_type: string;
        size_bytes: string;
        storage_path: string;
        uploaded_at: Date;
      }[]
    >`
      select application_id, id, kind, file_name, content_type,
             size_bytes::text, storage_path, uploaded_at
        from application_documents
       where application_id = any(${tx.array(ids)}::uuid[])
       order by uploaded_at
    `;

    const holds = await tx<
      { application_id: string; expires_at: Date | null }[]
    >`
      select application_id, expires_at
        from occupancies
       where application_id = any(${tx.array(ids)}::uuid[])
         and state in ('HELD','COMMITTED')
    `;

    const reservations = await tx<
      {
        application_id: string;
        id: string;
        organization_id: string;
        occupancy_id: string | null;
        fee_centavos: string;
        state: Reservation['state'];
        expires_at: Date | null;
      }[]
    >`
      select application_id, id, organization_id, occupancy_id,
             fee_centavos::text, state, expires_at
        from reservations
       where application_id = any(${tx.array(ids)}::uuid[])
    `;

    return rows.map<ApplicationDetail>((row) => ({
      ...toApplication(row),
      reference: row.reference,
      listingTitle: row.listing_title,
      photo: row.photo,
      moveInCostCentavos: centavos(Number(row.move_in_cost_centavos)),
      // Whichever hold is live — the reservation the applicant paid for, or
      // the one approval placed. The customer only cares that there is a
      // deadline and when it is.
      holdExpiresAt:
        holds.find((hold) => hold.application_id === row.id)?.expires_at ?? null,
      propertyName: row.property_name,
      areaLabel: row.area_label,
      cityLabel: row.city_label,
      monthlyRentCentavos: centavos(Number(row.monthly_rent_centavos)),
      documents: documents
        .filter((doc) => doc.application_id === row.id)
        .map((doc) => ({
          id: doc.id,
          kind: doc.kind,
          fileName: doc.file_name,
          contentType: doc.content_type,
          sizeBytes: Number(doc.size_bytes),
          storagePath: doc.storage_path,
          uploadedAt: doc.uploaded_at,
        })),
      reservation:
        reservations
          .filter((res) => res.application_id === row.id)
          .map<Reservation>((res) => ({
            id: res.id,
            organizationId: res.organization_id,
            applicationId: row.id,
            occupancyId: res.occupancy_id,
            feeCentavos: centavos(Number(res.fee_centavos)),
            state: res.state,
            expiresAt: res.expires_at,
          }))[0] ?? null,
    }));
  };

  return sql.begin(run) as Promise<readonly ApplicationDetail[]>;
}
