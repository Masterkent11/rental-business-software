/**
 * One timeline per resource.
 *
 * The long-term state and the nightly calendar are **projections** of this
 * (U-01). Nothing else is allowed to be a source of truth about whether a place
 * is free — not a cached flag, not a client, not a listing column.
 */
export type OccupancyKind = 'BOOKING' | 'LEASE' | 'BLOCK';

export type OccupancyState =
  | 'HELD'
  | 'COMMITTED'
  | 'RELEASED'
  | 'EXPIRED'
  | 'CANCELLED';

/** The two states that occupy a resource. Everything else is history. */
export const OCCUPYING_STATES: readonly OccupancyState[] = ['HELD', 'COMMITTED'];

/**
 * Half-open `[startsOn, endsOn)`, throughout.
 *
 * A guest checking out on the 10th and another checking in on the 10th do not
 * collide — which is the ordinary case, not an edge case, and the reason the
 * convention is fixed rather than decided per query.
 */
export interface DateRange {
  readonly startsOn: string; // YYYY-MM-DD
  readonly endsOn: string;
}

export interface Occupancy {
  readonly id: string;
  readonly organizationId: string;
  readonly resourceId: string;
  readonly kind: OccupancyKind;
  readonly state: OccupancyState;
  readonly during: DateRange;
  readonly expiresAt: Date | null;
}

export class InvalidDateRangeError extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Build a range, refusing the shapes that make no sense.
 *
 * A zero-night stay is rejected rather than silently normalised: someone asking
 * to check in and out on the same day has made a mistake, and quietly booking
 * nothing would hide it until they arrived.
 */
export function dateRange(startsOn: string, endsOn: string): DateRange {
  if (!ISO_DATE.test(startsOn) || !ISO_DATE.test(endsOn)) {
    throw new InvalidDateRangeError('Dates must be YYYY-MM-DD');
  }
  if (endsOn <= startsOn) {
    throw new InvalidDateRangeError('The end date must be after the start date');
  }
  return { startsOn, endsOn };
}

/** Nights in a half-open range — the number a guest is charged for. */
export function nightCount(range: DateRange): number {
  const start = Date.parse(`${range.startsOn}T00:00:00Z`);
  const end = Date.parse(`${range.endsOn}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

/** Every night a range covers. The end date is excluded — nobody sleeps there. */
export function nightsIn(range: DateRange): readonly string[] {
  const nights: string[] = [];
  const cursor = new Date(`${range.startsOn}T00:00:00Z`);
  const end = new Date(`${range.endsOn}T00:00:00Z`);

  while (cursor < end) {
    nights.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return nights;
}

export function overlaps(a: DateRange, b: DateRange): boolean {
  return a.startsOn < b.endsOn && b.startsOn < a.endsOn;
}

/**
 * A hold that has outlived its expiry is not occupancy any more.
 *
 * Evaluated on read as well as swept on write (ADR-0004), so an abandoned
 * checkout never shows a night as taken while the sweep is pending.
 */
export function isLive(occupancy: Occupancy, now: Date): boolean {
  if (!OCCUPYING_STATES.includes(occupancy.state)) return false;
  if (occupancy.state !== 'HELD') return true;
  return occupancy.expiresAt !== null && occupancy.expiresAt > now;
}

/** How long a customer has to finish paying before the nights go back. */
export const HOLD_MINUTES = 60;
