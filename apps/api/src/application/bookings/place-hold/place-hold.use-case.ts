import {
  OccupancyConflictError,
  SerializationError,
  type OccupancyRepository,
} from '@/application/ports/repositories/occupancy-repository.port.ts';
import {
  HOLD_MINUTES,
  dateRange,
  nightCount,
  type Occupancy,
} from '@/domain/occupancy/occupancy.ts';
import type { PlaceHoldInput } from './place-hold.types.ts';

const MAX_ATTEMPTS = 3;
const MAX_NIGHTS = 90;

export class StayTooLongError extends Error {}

export function placeHold(occupancies: OccupancyRepository) {
  return async function execute(input: PlaceHoldInput): Promise<Occupancy> {
    const during = dateRange(input.startsOn, input.endsOn);

    if (nightCount(during) > MAX_NIGHTS) {
      throw new StayTooLongError(
        `A stay may be at most ${MAX_NIGHTS} nights. Longer arrangements are leases.`,
      );
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        return await occupancies.placeHold({
          resourceId: input.resourceId,
          during,
          holdMinutes: HOLD_MINUTES,
          heldBy: input.heldBy,
          ...(input.guests !== undefined ? { guests: input.guests } : {}),
          ...(input.clientRef !== undefined ? { clientRef: input.clientRef } : {}),
        });
      } catch (error) {
        if (error instanceof OccupancyConflictError) throw error;
        if (!(error instanceof SerializationError)) throw error;

        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 25));
      }
    }

    throw lastError;
  };
}
