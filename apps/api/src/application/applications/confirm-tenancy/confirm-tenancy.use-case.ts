import type { Principal } from '@/domain/identity/identity.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { TenancyActivationRepository } from '@/application/ports/repositories/tenancy-activation-repository.port.ts';
import { assertMayDecideApplications } from '@/application/identity/application-authorization.rules.ts';
import { InvalidTransitionError } from '@/domain/applications/application-errors.ts';

export const confirmTenancy = (repository: TenancyActivationRepository, clock: Clock) =>
  async (input: {
    principal: Principal;
    organizationId: string;
    applicationId: string;
    requirementsReviewed: boolean;
  }) => {
    assertMayDecideApplications(input.principal, input.organizationId);
    if (!input.requirementsReviewed) throw new InvalidTransitionError('Confirm that all move-in requirements have been reviewed.');
    return repository.confirm({
      organizationId: input.organizationId,
      applicationId: input.applicationId,
      confirmedBy: input.principal.userId,
      now: clock.now(),
    });
  };
