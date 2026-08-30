import {
  assertRejectionHasReason,
  type ApplicationState,
} from '@/domain/applications/application.ts';
import type { ApplicationRepository, Application } from '@/application/ports/repositories/application-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayDecideApplications } from '@/application/identity/application-authorization.rules.ts';

export interface DecideApplicationInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly applicationId: string;
  readonly next: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  readonly reason?: string | undefined;
}

export const decideApplication =
  (applications: ApplicationRepository) =>
  (input: DecideApplicationInput): Promise<Application> => {
    assertMayDecideApplications(input.principal, input.organizationId);

    const reason =
      input.next === 'REJECTED'
        ? assertRejectionHasReason(input.reason)
        : (input.reason?.trim() || null);

    return applications.decide({
      organizationId: input.organizationId,
      applicationId: input.applicationId,
      deciderId: input.principal.userId,
      next: input.next as ApplicationState & ('APPROVED' | 'REJECTED' | 'UNDER_REVIEW'),
      reason,
    });
  };
