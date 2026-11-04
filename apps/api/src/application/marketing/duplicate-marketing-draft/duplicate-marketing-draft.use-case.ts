import type { Principal } from "@/domain/identity/identity.ts";
import type { MarketingRepository } from "@/application/ports/repositories/marketing-repository.port.ts";
import type { MarketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import { getMarketingDraft } from "@/application/marketing/get-marketing-draft/get-marketing-draft.use-case.ts";
import { saveMarketingDraft } from "@/application/marketing/save-marketing-draft/save-marketing-draft.use-case.ts";
export const duplicateMarketingDraft =
  (repo: MarketingRepository, access: MarketingAccess) =>
  async (principal: Principal, id: string) => {
    const original = await getMarketingDraft(repo, access)(principal, id);
    return saveMarketingDraft(repo, access)(principal, {
      ...original,
      title: original.title.slice(0, 112) + " copy",
      state: "DRAFT",
    });
  };
