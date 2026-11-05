import { facebookActor } from "@/application/marketing/facebook-actor.rules.ts";
import type { MarketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import type { FacebookConnectionSecrets } from "@/application/ports/providers/facebook-connection-secrets.port.ts";
import type { FacebookPagesProvider } from "@/application/ports/providers/facebook-pages.port.ts";
import type { FacebookConnectionRepository } from "@/application/ports/repositories/facebook-connection-repository.port.ts";
import type { Principal } from "@/domain/identity/identity.ts";
import {
  MarketingConflictError,
  MarketingUnavailableError,
} from "@/domain/marketing/marketing.ts";

export function completeFacebookAuthorization(
  repo: FacebookConnectionRepository,
  access: MarketingAccess,
  provider: FacebookPagesProvider | null,
  secrets: FacebookConnectionSecrets | null,
) {
  return async (principal: Principal, state: string, code: string | null) => {
    const actor = await facebookActor(access, principal);
    if (!provider || !secrets)
      throw new MarketingUnavailableError(
        "Facebook setup is unavailable in this environment.",
      );
    const digest = secrets.digest(state);
    const expired = () =>
      new MarketingConflictError(
        "This Facebook connection attempt has expired. Start again.",
      );
    if (!(await repo.claim(actor, digest))) throw expired();
    if (code === null) return { outcome: "CANCELLED" as const };
    const eligible = await provider.eligiblePages(code);
    const pages = eligible.map(({ id, name, token }) => ({
      id,
      name,
      encryptedToken: secrets.seal(actor.agentId, id, token),
    }));
    if (!(await repo.stage(actor, digest, pages))) throw expired();
    return {
      outcome: pages.length
        ? ("SELECT_PAGE" as const)
        : ("NO_ELIGIBLE_PAGES" as const),
    };
  };
}
