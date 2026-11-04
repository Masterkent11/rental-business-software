import type { AdministrationRepository } from "@/application/ports/repositories/administration-repository.port.ts";
import { OrganizationForbiddenError } from "@/application/identity/resolve-principal/resolve-principal.use-case.ts";
import type { Principal } from "@/domain/identity/identity.ts";
import {
  mayAdminister,
  validAdministrativeAudit,
  type AdministrativeAudit,
  type AdministrationPermission,
  type AdministrativeContext,
} from "@/domain/administration/administration.ts";
export const authorizeAdministration =
  (repository: AdministrationRepository) =>
  async (
    principal: Principal,
    permission: AdministrationPermission,
    audit: AdministrativeAudit,
    targetId: string | null = null,
  ): Promise<AdministrativeContext> => {
    if (!validAdministrativeAudit(audit))
      throw new OrganizationForbiddenError(
        "A valid administrative purpose and request ID are required",
      );
    const allowed =
      mayAdminister(principal) &&
      (await repository.permitted(principal.userId, permission));
    await repository.audit(
      principal.userId,
      permission,
      targetId,
      allowed ? "ALLOWED" : "DENIED",
      audit,
    );
    if (!allowed)
      throw new OrganizationForbiddenError(
        "Only platform reviewers with MFA and the required permission may access administration",
      );
    return { ...audit, assuranceLevel: "aal2" };
  };
