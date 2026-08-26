import {
  assertRejectionHasReason,
  type ApplicationState,
} from '../../domain/applications/application.ts';
import type { ApplicationRepository } from '../../application/ports/application-repository.ts';

/**
 * Submit an application.
 *
 * Places no hold — many people may apply for one place, and approval is what
 * takes it off the market. Holding inventory for every hopeful applicant would
 * leave a good listing with nothing left to sell.
 */
export const submitApplication =
  (applications: ApplicationRepository) =>
  (input: {
    resourceId: string;
    applicantId: string;
    desiredMoveIn: string;
    desiredTermMonths: number;
    message: string;
  }) =>
    applications.submit(input);

export const listMyApplications =
  (applications: ApplicationRepository) => (applicantId: string) =>
    applications.forApplicant(applicantId);

export const viewMyApplication =
  (applications: ApplicationRepository) =>
  (applicantId: string, applicationId: string) =>
    applications.forApplicantById(applicantId, applicationId);

export const withdrawApplication =
  (applications: ApplicationRepository) =>
  (applicantId: string, applicationId: string) =>
    applications.withdraw(applicantId, applicationId);

export const listOrganizationApplications =
  (applications: ApplicationRepository) => (organizationId: string) =>
    applications.forOrganization(organizationId);

/**
 * The owner's decision.
 *
 * A rejection must carry a reason. The applicant sees it, and a refusal with no
 * explanation is what customers complain about most — asking for one sentence
 * is also what makes an owner actually decide rather than clear a queue.
 */
export const decideApplication =
  (applications: ApplicationRepository) =>
  (input: {
    organizationId: string;
    applicationId: string;
    deciderId: string;
    next: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
    reason?: string;
  }) => {
    const reason =
      input.next === 'REJECTED'
        ? assertRejectionHasReason(input.reason)
        : (input.reason?.trim() || null);

    return applications.decide({
      organizationId: input.organizationId,
      applicationId: input.applicationId,
      deciderId: input.deciderId,
      next: input.next as ApplicationState & ('APPROVED' | 'REJECTED' | 'UNDER_REVIEW'),
      reason,
    });
  };
