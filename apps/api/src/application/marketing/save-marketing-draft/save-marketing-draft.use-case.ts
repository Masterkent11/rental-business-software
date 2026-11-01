import type { Principal } from "@/domain/identity/identity.ts";
import type { MarketingRepository } from "@/application/ports/repositories/marketing-repository.port.ts";
import type { MarketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import {
  validateDraft,
  MarketingForbiddenError,
  type DraftInput,
} from "@/domain/marketing/marketing.ts";
export const saveMarketingDraft =
  (repo: MarketingRepository, access: MarketingAccess) =>
  async (
    principal: Principal,
    raw: DraftInput,
    id?: string,
    version?: number,
  ) => {
    await access.agent(principal);
    const input = validateDraft(raw);
    if (input.listingId) {
      const property = await access.property(principal, input.listingId);
      if (input.sourcePhotos.some((url) => !property.photos.includes(url)))
        throw new MarketingForbiddenError(
          "Choose photos from the current authorized property.",
        );
    }
    return repo.saveDraft(principal.userId, input, id, version);
  };
