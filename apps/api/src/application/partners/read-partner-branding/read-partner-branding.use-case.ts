import type { Principal } from "@/domain/identity/identity.ts";
import { hasCapability } from "@/domain/identity/identity.ts";
import type { PartnerShellRepository } from "@/application/ports/repositories/partner-shell-repository.port.ts";
import { partnerContext } from "@/application/partners/partner-context.rules.ts";
export const readPartnerBranding =
  (repo: PartnerShellRepository) => async (principal: Principal) => ({
    logo: await repo.readLogo(partnerContext(principal)),
    canEdit:
      !principal.organizationId ||
      hasCapability(principal, "OWNER", principal.organizationId),
  });
