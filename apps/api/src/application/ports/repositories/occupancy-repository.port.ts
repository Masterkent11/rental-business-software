import type { DateRange, Occupancy } from '@/domain/occupancy/occupancy.ts';

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
 */
export class NotBookableError extends Error {}

/** Raised when SERIALIZABLE could not order the transactions. Retryable. */
export class SerializationError extends Error {}

export interface OccupancyRepository {
  /**
   * The nightly calendar for a resource.
   */
  nightsFor(resourceId: string, range: DateRange): Promise<readonly NightAvailability[]>;

  /**
   * Place a hold.
   */
  placeHold(input: {
    resourceId: string;
    during: DateRange;
    holdMinutes: number;
    heldBy: string;
    guests?: number;
    clientRef?: string | null;
  }): Promise<Occupancy>;
}
