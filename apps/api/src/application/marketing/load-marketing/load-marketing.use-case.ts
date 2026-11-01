import type { Principal } from "@/domain/identity/identity.ts";
import type { MarketingRepository } from "@/application/ports/repositories/marketing-repository.port.ts";
import type { MarketingAccess } from "@/application/marketing/marketing-access.rules.ts";
export const loadMarketing =
  (repo: MarketingRepository, access: MarketingAccess) =>
  async (principal: Principal) => {
    await access.agent(principal);
    const [media, drafts, properties] = await Promise.all([
      repo.listMedia(principal.userId),
      repo.listDrafts(principal.userId),
      access.properties(principal),
    ]);
    return {
      media,
      drafts: drafts.map((d) => {
        const property = properties.find((p) => p.id === d.listingId);
        const actionRequired = Boolean(
          d.listingId &&
          (!property ||
            d.sourcePhotos.some((url) => !property.photos.includes(url))),
        );
        return {
          ...d,
          actionRequired,
          sourcePhotos: actionRequired ? [] : d.sourcePhotos,
        };
      }),
      properties,
    };
  };
