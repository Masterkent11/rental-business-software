import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import {
  AgentProfileNotFoundError,
  responseMetrics,
  type AgentProfile,
  type AgentPublicStats,
} from '@/domain/agents/agent.ts';
import type { Listing } from '@/domain/listings/listing.ts';
import { PUBLIC } from '@/domain/shared/organization-scope.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';

export interface PublicAgentView {
  readonly agent: AgentProfile;
  readonly stats: AgentPublicStats;
  readonly listings: readonly Listing[];
}

const RESPONSE_WINDOW_DAYS = 90;

export const viewPublicAgent =
  (agents: AgentRepository, listings: ListingRepository, clock: Clock) =>
  async (input: { readonly agentId: string }): Promise<PublicAgentView> => {
    const agent = await agents.findPublic(input.agentId);
    if (!agent) throw new AgentProfileNotFoundError('Agent not found');
    const since = new Date(clock.now().getTime() - RESPONSE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const [samples, activeListings, ids] = await Promise.all([
      agents.responseSamples(agent.id, since),
      agents.activeListingCount(agent.id),
      agents.publishedListingIds(agent.id),
    ]);
    const page = ids.length
      ? await listings.search(PUBLIC, { ids, limit: Math.min(ids.length, 50), offset: 0 })
      : { items: [], total: 0 };
    return {
      agent,
      stats: { ...responseMetrics(samples), activeListings },
      listings: page.items,
    };
  };
