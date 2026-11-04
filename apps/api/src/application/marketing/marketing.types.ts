import type { loadMarketing } from "@/application/marketing/load-marketing/load-marketing.use-case.ts";
import type { saveMarketingDraft } from "@/application/marketing/save-marketing-draft/save-marketing-draft.use-case.ts";
import type { getMarketingDraft } from "@/application/marketing/get-marketing-draft/get-marketing-draft.use-case.ts";
import type { removeMarketingDraft } from "@/application/marketing/remove-marketing-draft/remove-marketing-draft.use-case.ts";
import type { duplicateMarketingDraft } from "@/application/marketing/duplicate-marketing-draft/duplicate-marketing-draft.use-case.ts";
import type { uploadMarketingMedia } from "@/application/marketing/upload-marketing-media/upload-marketing-media.use-case.ts";
import type { readMarketingMedia } from "@/application/marketing/read-marketing-media/read-marketing-media.use-case.ts";
import type { removeMarketingMedia } from "@/application/marketing/remove-marketing-media/remove-marketing-media.use-case.ts";
export interface MarketingUseCases {
  load: ReturnType<typeof loadMarketing>;
  save: ReturnType<typeof saveMarketingDraft>;
  get: ReturnType<typeof getMarketingDraft>;
  remove: ReturnType<typeof removeMarketingDraft>;
  duplicate: ReturnType<typeof duplicateMarketingDraft>;
  upload: ReturnType<typeof uploadMarketingMedia>;
  readMedia: ReturnType<typeof readMarketingMedia>;
  removeMedia: ReturnType<typeof removeMarketingMedia>;
}
