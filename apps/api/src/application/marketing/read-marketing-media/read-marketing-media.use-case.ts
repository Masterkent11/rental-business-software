import type { Principal } from "@/domain/identity/identity.ts";
import type { MarketingRepository } from "@/application/ports/repositories/marketing-repository.port.ts";
import type { MediaStorage } from "@/application/ports/storage/media-storage.port.ts";
import type { MarketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import {
  MarketingNotFoundError,
  MarketingUnavailableError,
} from "@/domain/marketing/marketing.ts";
export const readMarketingMedia =
  (repo: MarketingRepository, storage: MediaStorage, access: MarketingAccess) =>
  async (principal: Principal, id: string) => {
    await access.agent(principal);
    const media = await repo.findMedia(principal.userId, id);
    if (!media || media.state !== "READY")
      throw new MarketingNotFoundError("Ready media not found.");
    try {
      return {
        url: await storage.createReadUrl(media.storagePath),
        expiresInSeconds: 120,
      };
    } catch {
      throw new MarketingUnavailableError(
        "Media preview is unavailable. Please try again.",
      );
    }
  };
