import type { Principal } from "@/domain/identity/identity.ts";
import type { MarketingRepository } from "@/application/ports/repositories/marketing-repository.port.ts";
import type { MediaStorage } from "@/application/ports/storage/media-storage.port.ts";
import type { MarketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import { MarketingUnavailableError } from "@/domain/marketing/marketing.ts";
export const removeMarketingMedia =
  (repo: MarketingRepository, storage: MediaStorage, access: MarketingAccess) =>
  async (principal: Principal, id: string) => {
    await access.agent(principal);
    const media = await repo.beginMediaRemoval(principal.userId, id);
    try {
      await storage.removePrefix(
        media.storagePath.slice(0, media.storagePath.lastIndexOf("/")),
      );
    } catch {
      await repo.setMediaState(principal.userId, id, "FAILED");
      throw new MarketingUnavailableError(
        "Storage could not remove this media. Please try again.",
      );
    }
    await repo.removeMedia(principal.userId, id);
  };
