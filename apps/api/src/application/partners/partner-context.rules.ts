import { hasCapability, type Principal } from "@/domain/identity/identity.ts";
import type { PartnerContext } from "@/domain/partners/partner-shell.ts";
import { OrganizationForbiddenError } from "@/application/identity/resolve-principal/resolve-principal.use-case.ts";
import { assertMayManageOrganization } from "@/application/identity/application-authorization.rules.ts";
export function partnerContext(
  principal: Principal,
  write = false,
): PartnerContext {
  if (principal.organizationId) {
    assertMayManageOrganization(principal, principal.organizationId);
    if (write && !hasCapability(principal, "OWNER", principal.organizationId))
      throw new OrganizationForbiddenError(
        "Only the workspace owner can change its logo.",
      );
    return {
      kind: "OWNER",
      userId: principal.userId,
      organizationId: principal.organizationId,
    };
  }
  if (!hasCapability(principal, "AGENT"))
    throw new OrganizationForbiddenError(
      "An active partner workspace is required.",
    );
  return { kind: "AGENT", userId: principal.userId };
}
