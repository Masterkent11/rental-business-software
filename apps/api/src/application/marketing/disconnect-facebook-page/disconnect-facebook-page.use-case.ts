import { facebookActor } from "@/application/marketing/facebook-actor.rules.ts";
import type { MarketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import type { FacebookConnectionRepository } from "@/application/ports/repositories/facebook-connection-repository.port.ts";
import type { Principal } from "@/domain/identity/identity.ts";

export function disconnectFacebookPage(
  repo: FacebookConnectionRepository,
  access: MarketingAccess,
) {
  return async (principal: Principal) => {
    await repo.disconnect(await facebookActor(access, principal));
  };
}
