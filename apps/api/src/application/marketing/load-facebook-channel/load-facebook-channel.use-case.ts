import { facebookActor } from "@/application/marketing/facebook-actor.rules.ts";
import type { MarketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import type { FacebookConnectionRepository } from "@/application/ports/repositories/facebook-connection-repository.port.ts";
import type { Principal } from "@/domain/identity/identity.ts";

export function loadFacebookChannel(
  repo: FacebookConnectionRepository,
  access: MarketingAccess,
  enabled: boolean,
) {
  return async (principal: Principal) => {
    const actor = await facebookActor(access, principal);
    if (!enabled) return { enabled, connection: null, selection: null };
    return { enabled, ...(await repo.read(actor)) };
  };
}
