import { facebookActor } from "@/application/marketing/facebook-actor.rules.ts";
import type { MarketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import type { FacebookConnectionRepository } from "@/application/ports/repositories/facebook-connection-repository.port.ts";
import type { Principal } from "@/domain/identity/identity.ts";
import {
  MarketingConflictError,
  MarketingUnavailableError,
} from "@/domain/marketing/marketing.ts";

export function selectFacebookPage(
  repo: FacebookConnectionRepository,
  access: MarketingAccess,
  enabled: boolean,
) {
  return async (principal: Principal, selectionId: string, pageId: string) => {
    const actor = await facebookActor(access, principal);
    if (!enabled)
      throw new MarketingUnavailableError(
        "Facebook setup is unavailable in this environment.",
      );
    if (!(await repo.select(actor, selectionId, pageId)))
      throw new MarketingConflictError(
        "This Page selection is unavailable. Connect Facebook again.",
      );
    return { enabled, ...(await repo.read(actor)) };
  };
}
