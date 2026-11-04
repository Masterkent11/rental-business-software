import type { Principal } from "@/domain/identity/identity.ts";
import { normalizePartnerQuery } from "@/domain/partners/partner-shell.ts";
import type { PartnerShellRepository } from "@/application/ports/repositories/partner-shell-repository.port.ts";
import { partnerContext } from "@/application/partners/partner-context.rules.ts";
export const searchPartner =
  (repo: PartnerShellRepository) =>
  async (principal: Principal, raw: string) => {
    const context = partnerContext(principal),
      query = normalizePartnerQuery(raw);
    return { items: query.length < 2 ? [] : await repo.search(context, query) };
  };
