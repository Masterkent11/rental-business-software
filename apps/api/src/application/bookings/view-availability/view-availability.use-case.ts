import type { OccupancyRepository } from '@/application/ports/repositories/occupancy-repository.port.ts';
import { dateRange } from '@/domain/occupancy/occupancy.ts';
import type {
  ViewAvailabilityInput,
  ViewAvailabilityResult,
} from './view-availability.types.ts';

export function viewAvailability(occupancies: OccupancyRepository) {
  return async function execute(
    input: ViewAvailabilityInput,
  ): Promise<ViewAvailabilityResult> {
    const range = dateRange(input.startsOn, input.endsOn);
    return occupancies.nightsFor(input.resourceId, range);
  };
}
