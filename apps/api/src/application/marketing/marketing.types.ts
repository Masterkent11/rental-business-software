import type { loadMarketing } from "@/application/marketing/load-marketing/load-marketing.use-case.ts";
import type { saveMarketingDraft } from "@/application/marketing/save-marketing-draft/save-marketing-draft.use-case.ts";
import type { getMarketingDraft } from "@/application/marketing/get-marketing-draft/get-marketing-draft.use-case.ts";
import type { removeMarketingDraft } from "@/application/marketing/remove-marketing-draft/remove-marketing-draft.use-case.ts";
import type { duplicateMarketingDraft } from "@/application/marketing/duplicate-marketing-draft/duplicate-marketing-draft.use-case.ts";
import type { uploadMarketingMedia } from "@/application/marketing/upload-marketing-media/upload-marketing-media.use-case.ts";
import type { readMarketingMedia } from "@/application/marketing/read-marketing-media/read-marketing-media.use-case.ts";
import type { removeMarketingMedia } from "@/application/marketing/remove-marketing-media/remove-marketing-media.use-case.ts";
import type { loadFacebookChannel } from "@/application/marketing/load-facebook-channel/load-facebook-channel.use-case.ts";
import type { startFacebookConnection } from "@/application/marketing/start-facebook-connection/start-facebook-connection.use-case.ts";
import type { completeFacebookAuthorization } from "@/application/marketing/complete-facebook-authorization/complete-facebook-authorization.use-case.ts";
import type { selectFacebookPage } from "@/application/marketing/select-facebook-page/select-facebook-page.use-case.ts";
import type { disconnectFacebookPage } from "@/application/marketing/disconnect-facebook-page/disconnect-facebook-page.use-case.ts";
export interface MarketingUseCases {
  facebook: {
    load: ReturnType<typeof loadFacebookChannel>;
    start: ReturnType<typeof startFacebookConnection>;
    complete: ReturnType<typeof completeFacebookAuthorization>;
    select: ReturnType<typeof selectFacebookPage>;
    disconnect: ReturnType<typeof disconnectFacebookPage>;
  };
  load: ReturnType<typeof loadMarketing>;
  save: ReturnType<typeof saveMarketingDraft>;
  get: ReturnType<typeof getMarketingDraft>;
  remove: ReturnType<typeof removeMarketingDraft>;
  duplicate: ReturnType<typeof duplicateMarketingDraft>;
  upload: ReturnType<typeof uploadMarketingMedia>;
  readMedia: ReturnType<typeof readMarketingMedia>;
  removeMedia: ReturnType<typeof removeMarketingMedia>;
}
