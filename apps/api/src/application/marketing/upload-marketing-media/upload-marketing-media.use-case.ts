import type { Principal } from "@/domain/identity/identity.ts";
import type { MarketingRepository } from "@/application/ports/repositories/marketing-repository.port.ts";
import type { MediaStorage } from "@/application/ports/storage/media-storage.port.ts";
import type { MarketingMediaProcessor } from "@/application/ports/providers/marketing-media-processor.port.ts";
import type { MarketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import { MarketingUnavailableError } from "@/domain/marketing/marketing.ts";
export const uploadMarketingMedia =
  (
    repo: MarketingRepository,
    storage: MediaStorage,
    processor: MarketingMediaProcessor,
    access: MarketingAccess,
  ) =>
  async (
    principal: Principal,
    input: { fileName: string; contentType: string; data: string },
  ) => {
    await access.agent(principal);
    const prepared = await processor.prepare(input.data, input.contentType);
    const media = await repo.reserveMedia(principal.userId, {
      fileName: input.fileName,
      contentType: prepared.contentType,
      bytes: prepared.body.length,
    });
    try {
      await storage.put([
        {
          path: media.storagePath,
          body: prepared.body,
          contentType: prepared.contentType,
        },
      ]);
      await repo.setMediaState(principal.userId, media.id, "READY");
      return { ...media, state: "READY" as const };
    } catch {
      await repo.setMediaState(principal.userId, media.id, "FAILED");
      throw new MarketingUnavailableError(
        "Upload did not finish. Remove the failed item and try again.",
      );
    }
  };
