import type {
  DiscoveryRepository,
  PopularArea,
  PopularAreaQuery,
} from '@/application/ports/repositories/discovery-repository.port.ts';

export const listPopularAreas =
  (discovery: DiscoveryRepository) =>
  async (query: PopularAreaQuery): Promise<readonly PopularArea[]> =>
    discovery.popularAreas({ ...query, limit: Math.min(Math.max(query.limit, 1), 20) });
