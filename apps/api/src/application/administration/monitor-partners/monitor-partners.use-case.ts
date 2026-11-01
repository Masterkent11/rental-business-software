import type { AdministrationRepository } from "@/application/ports/repositories/administration-repository.port.ts";
import type { authorizeAdministration } from "@/application/administration/authorize-administration/authorize-administration.use-case.ts";
import type { Principal } from "@/domain/identity/identity.ts";
import type { AdministrativeAudit } from "@/domain/administration/administration.ts";
export const monitorPartners =
  (
    repository: AdministrationRepository,
    authorize: ReturnType<typeof authorizeAdministration>,
  ) =>
  async (principal: Principal, audit: AdministrativeAudit) => {
    const context = await authorize(principal, "PARTNER_MONITOR", audit);
    return repository.monitor(principal.userId, context);
  };
