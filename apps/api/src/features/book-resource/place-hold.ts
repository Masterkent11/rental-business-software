import {
  OccupancyConflictError,
  SerializationError,
  type OccupancyRepository,
} from '../../application/ports/occupancy-repository.ts';
import {
  HOLD_MINUTES,
  dateRange,
  nightCount,
  type Occupancy,
} from '../../domain/occupancy/occupancy.ts';

/** How many times a serialization failure is retried before giving up. */
const MAX_ATTEMPTS = 3;

export class StayTooLongError extends Error {}

/** Refuses a stay long enough to be a lease in disguise. */
const MAX_NIGHTS = 90;

/**
 * Hold nights while the customer pays.
 *
 * A hold, not a booking: the nights are taken off the market for
 * [HOLD_MINUTES] and returned automatically if payment does not arrive. The
 * alternative — booking first and reconciling later — means either
 * double-selling or holding inventory hostage to an abandoned checkout.
 *
 * Retries exist for one reason only: SERIALIZABLE can refuse a transaction it
 * cannot order, which is an accident of timing rather than a real conflict. A
 * genuine conflict is never retried — those nights are gone, and the customer
 * has to be told at request time rather than left waiting.
 */
export const placeHold =
  (occupancies: OccupancyRepository) =>
  async (input: {
    resourceId: string;
    startsOn: string;
    endsOn: string;
    heldBy: string;
  }): Promise<Occupancy> => {
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
        });
      } catch (error) {
        if (error instanceof OccupancyConflictError) throw error;
        if (!(error instanceof SerializationError)) throw error;

        lastError = error;
        // Brief, growing backoff so two contending requests do not retry in
        // lockstep and collide again.
        await new Promise((resolve) => setTimeout(resolve, attempt * 25));
      }
    }

    throw lastError;
  };

/** The nightly calendar a booking screen renders. */
export const viewAvailability =
  (occupancies: OccupancyRepository) =>
  async (input: { resourceId: string; startsOn: string; endsOn: string }) => {
    const range = dateRange(input.startsOn, input.endsOn);
    return occupancies.nightsFor(input.resourceId, range);
  };
