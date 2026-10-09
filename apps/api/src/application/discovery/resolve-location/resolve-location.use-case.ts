import type { DiscoveryRepository, ResolvedPlace } from '@/application/ports/repositories/discovery-repository.port.ts';
import { assertCoordinates, type Coordinates } from '@/domain/shared/geo.ts';

export const RESOLVE_LOCATION_MAX_KM = 60;

export const resolveLocation =
  (discovery: DiscoveryRepository) =>
  async (origin: Coordinates): Promise<ResolvedPlace | null> =>
    discovery.nearestCity(assertCoordinates(origin), RESOLVE_LOCATION_MAX_KM);
