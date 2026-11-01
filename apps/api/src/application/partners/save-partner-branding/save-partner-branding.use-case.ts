import type { Principal } from "@/domain/identity/identity.ts";
import type { PartnerShellRepository } from "@/application/ports/repositories/partner-shell-repository.port.ts";
import type { PartnerLogoProcessor } from "@/application/ports/providers/partner-logo-processor.port.ts";
import { partnerContext } from "@/application/partners/partner-context.rules.ts";
export const savePartnerBranding =
  (repo: PartnerShellRepository, processor: PartnerLogoProcessor) =>
  async (
    principal: Principal,
    input: { data: string; contentType: string } | null,
  ) => {
    const context = partnerContext(principal, true);
    const logo = input
      ? await processor.prepare(input.data, input.contentType)
      : null;
    await repo.saveLogo(context, logo);
    return { logo, canEdit: true };
  };
