import type { MarketingMedia } from "@/domain/marketing/marketing.ts";
import type { loadMarketing } from "@/application/marketing/load-marketing/load-marketing.use-case.ts";
export const toMarketingMediaHttp = (media: MarketingMedia) => ({
  id: media.id,
  fileName: media.fileName,
  contentType: media.contentType,
  bytes: media.bytes,
  state: media.state,
  createdAt: media.createdAt,
});
export const toMarketingHttp = (
  value: Awaited<ReturnType<ReturnType<typeof loadMarketing>>>,
) => ({ ...value, media: value.media.map(toMarketingMediaHttp) });
