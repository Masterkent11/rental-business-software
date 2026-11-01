import type { PartnerOnboardingRepository } from "@/application/ports/repositories/partner-onboarding.port.ts";
import type { Principal } from "@/domain/identity/identity.ts";
import { assertPartnerEnrollment, normaliseWorkspaceName } from "@/domain/identity/partner-onboarding.ts";
import { UnauthenticatedError } from "@/application/identity/resolve-principal/resolve-principal.use-case.ts";

export function createOwnerWorkspace(repository: PartnerOnboardingRepository) {
  return async (input: {
    readonly principal: Principal;
    readonly workspaceName: string;
  }) => {
    if (!input.principal.userId)
      throw new UnauthenticatedError("Please sign in again.");
    assertPartnerEnrollment(input.principal,'OWNER');
    return repository.createOwnerWorkspace({
      userId: input.principal.userId,
      workspaceName: normaliseWorkspaceName(input.workspaceName),
    });
  };
}
