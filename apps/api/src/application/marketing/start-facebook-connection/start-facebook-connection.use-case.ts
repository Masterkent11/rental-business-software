import { facebookActor } from "@/application/marketing/facebook-actor.rules.ts";
import type { MarketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import type { FacebookConnectionSecrets } from "@/application/ports/providers/facebook-connection-secrets.port.ts";
import type { FacebookPagesProvider } from "@/application/ports/providers/facebook-pages.port.ts";
import type { FacebookConnectionRepository } from "@/application/ports/repositories/facebook-connection-repository.port.ts";
import type { Principal } from "@/domain/identity/identity.ts";
import { MarketingUnavailableError } from "@/domain/marketing/marketing.ts";

export function startFacebookConnection(
  repo: FacebookConnectionRepository,
  access: MarketingAccess,
  provider: FacebookPagesProvider | null,
  secrets: FacebookConnectionSecrets | null,
) {
  return async (principal: Principal) => {
    const actor = await facebookActor(access, principal);
    if (!provider || !secrets)
      throw new MarketingUnavailableError(
        "Facebook setup is unavailable in this environment.",
      );
    const state = secrets.createState();
    await repo.start(actor, secrets.digest(state));
    return { authorizationUrl: provider.authorizationUrl(state) };
  };
}
