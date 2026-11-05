import type { MarketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import type { Principal } from "@/domain/identity/identity.ts";

export async function facebookActor(
  access: MarketingAccess,
  principal: Principal,
) {
  const profile = await access.agent(principal);
  return { userId: principal.userId, agentId: profile.id };
}
