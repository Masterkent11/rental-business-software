import type { Principal } from "@/domain/identity/identity.ts";
import { hasCapability } from "@/domain/identity/identity.ts";
import {
  RepresentationForbiddenError,
  isAssignable,
  type AgentProfile,
} from "@/domain/agents/agent.ts";
import type { AgentRepository } from "@/application/ports/repositories/agent-repository.port.ts";
import type { ListingRepository } from "@/application/ports/repositories/listing-repository.port.ts";
import type { RepresentationRepository } from "@/application/ports/repositories/representation-repository.port.ts";
import type { ListingGate } from "@/application/identity/partner-access.rules.ts";
import type { Clock } from "@/application/ports/providers/clock.port.ts";
import {
  MarketingForbiddenError,
  type MarketingProperty,
} from "@/domain/marketing/marketing.ts";
export function marketingAccess(
  agents: AgentRepository,
  listings: ListingRepository,
  representations: RepresentationRepository,
  gate: ListingGate,
  clock: Clock,
) {
  const agent = async (principal: Principal) => {
    if (!hasCapability(principal, "AGENT"))
      throw new MarketingForbiddenError("An Agent workspace is required.");
    const profile = await agents.findByUser(principal.userId);
    if (!profile || profile.verificationState === "SUSPENDED")
      throw new MarketingForbiddenError(
        "Your Agent profile is not available for marketing.",
      );
    return profile;
  };
  const resolveProperty = async (
    principal: Principal,
    profile: AgentProfile,
    listingId: string,
  ): Promise<MarketingProperty> => {
    if (!isAssignable(profile))
      throw new MarketingForbiddenError(
        "A verified public Agent profile is required to use represented property media.",
      );
    const access = await gate({
      principal,
      organizationId: null,
      listingId,
      permission: "canEditListing",
    });
    const rep = access.representation!;
    const now = clock.now().getTime();
    if (
      (rep.terms.validFrom && rep.terms.validFrom.getTime() > now) ||
      (rep.terms.validUntil && rep.terms.validUntil.getTime() <= now)
    )
      throw new MarketingForbiddenError(
        "This property representation is not current.",
      );
    const listing = await listings.findRepresented(principal.userId, listingId);
    if (!listing || listing.state !== "PUBLISHED")
      throw new MarketingForbiddenError(
        "Choose an approved represented property.",
      );
    return {
      id: listing.id,
      title: listing.title,
      photos: listing.photos,
      location: [listing.areaLabel, listing.cityLabel].filter(Boolean).join(", "),
    };
  };
  const property = async (principal: Principal, listingId: string) =>
    resolveProperty(principal, await agent(principal), listingId);
  const properties = async (
    principal: Principal,
  ): Promise<readonly MarketingProperty[]> => {
    const profile = await agent(principal);
    if (!isAssignable(profile)) return [];
    const reps = await representations.listForAgent(principal.userId);
    const result: MarketingProperty[] = [];
    const active = reps.filter(
      (r) => r.state === "ACTIVE" && r.permissions.canEditListing,
    );
    for (let offset = 0; offset < active.length; offset += 8) {
      const batch = await Promise.all(
        active.slice(offset, offset + 8).map(async (rep) => {
          try {
            return await resolveProperty(principal, profile, rep.listingId);
          } catch (error) {
            if (
              !(error instanceof MarketingForbiddenError) &&
              !(error instanceof RepresentationForbiddenError)
            )
              throw error;
            return null;
          }
        }),
      );
      for (const listing of batch) if (listing) result.push(listing);
    }
    return result;
  };
  return { agent, property, properties };
}
export type MarketingAccess = ReturnType<typeof marketingAccess>;
