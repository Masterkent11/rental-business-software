import type { DateRange, Occupancy } from '../../domain/occupancy/occupancy.ts';

export type NightStatus = 'OPEN' | 'HELD' | 'BOOKED' | 'LEASED' | 'BLOCKED';

export interface NightAvailability {
  readonly night: string;
  readonly status: NightStatus;
}

/** Raised when the database's exclusion constraint refuses the write. */
export class OccupancyConflictError extends Error {
  constructor(
    message: string,
    readonly conflict: DateRange | null = null,
  ) {
    super(message);
  }
}

/**
 * Raised when the resource has no published, nightly listing.
 *
 * Absent rather than forbidden, like every other unpublished read (D-12): a
 * booking attempt must not become a way to discover inventory that is not on
 * the market.
 */
export class NotBookableError extends Error {}

/** Raised when SERIALIZABLE could not order the transactions. Retryable. */
export class SerializationError extends Error {}

export interface OccupancyRepository {
  /**
   * The nightly calendar for a resource.
   *
   * Reads the projection, but discounts expired holds at query time so an
   * abandoned checkout never shows as taken.
   */
  nightsFor(resourceId: string, range: DateRange): Promise<readonly NightAvailability[]>;

  /**
   * Place a hold.
   *
   * The implementation is required to run inside a SERIALIZABLE transaction
   * with an advisory lock on the **resource root** (ADR-0005), sweep expired
   * holds on that tree, insert the occupancy, and update the projection — all
   * in the same transaction. Throws [OccupancyConflictError] when the nights
   * are taken.
   */
  placeHold(input: {
    resourceId: string;
    during: DateRange;
    holdMinutes: number;
    /** The guest. A booking nobody owns is not a booking. */
    heldBy: string;
  }): Promise<Occupancy>;
}
