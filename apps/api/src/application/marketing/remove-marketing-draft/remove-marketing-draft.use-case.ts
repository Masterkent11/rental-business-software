import type { Principal } from "@/domain/identity/identity.ts";
import type { MarketingRepository } from "@/application/ports/repositories/marketing-repository.port.ts";
import type { MarketingAccess } from "@/application/marketing/marketing-access.rules.ts";
export const removeMarketingDraft =
  (repo: MarketingRepository, access: MarketingAccess) =>
  async (principal: Principal, id: string) => {
    await access.agent(principal);
    await repo.removeDraft(principal.userId, id);
  };
