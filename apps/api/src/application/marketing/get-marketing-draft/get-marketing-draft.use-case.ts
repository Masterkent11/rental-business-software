import type { Principal } from "@/domain/identity/identity.ts";
import type { MarketingRepository } from "@/application/ports/repositories/marketing-repository.port.ts";
import type { MarketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import {
  MarketingForbiddenError,
  MarketingNotFoundError,
} from "@/domain/marketing/marketing.ts";
export const getMarketingDraft =
  (repo: MarketingRepository, access: MarketingAccess) =>
  async (principal: Principal, id: string) => {
    await access.agent(principal);
    const draft = await repo.findDraft(principal.userId, id);
    if (!draft) throw new MarketingNotFoundError("Draft not found.");
    if (draft.listingId) {
      const property = await access.property(principal, draft.listingId);
      if (draft.sourcePhotos.some((url) => !property.photos.includes(url)))
        throw new MarketingForbiddenError(
          "Property media access changed. Update the draft first.",
        );
    }
    return draft;
  };
