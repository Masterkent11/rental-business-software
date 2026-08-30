import type { ApplicationRepository, ApplicationDetail } from '@/application/ports/repositories/application-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayDecideApplications } from '@/application/identity/application-authorization.rules.ts';

export const listOrganizationApplications =
  (applications: ApplicationRepository) =>
  (
    principal: Principal,
    organizationId: string,
  ): Promise<readonly ApplicationDetail[]> => {
    assertMayDecideApplications(principal, organizationId);
    return applications.forOrganization(organizationId);
  };
