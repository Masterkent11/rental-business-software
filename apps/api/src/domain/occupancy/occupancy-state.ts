export type OccupancyKind = 'BOOKING' | 'LEASE' | 'BLOCK';

export type OccupancyState =
  | 'HELD'
  | 'COMMITTED'
  | 'RELEASED'
  | 'EXPIRED'
  | 'CANCELLED';

/** The two states that occupy a resource. Everything else is history. */
export const OCCUPYING_STATES: readonly OccupancyState[] = ['HELD', 'COMMITTED'];

export interface DateRange {
  readonly startsOn: string; // YYYY-MM-DD
  readonly endsOn: string;
}

/** How long a customer has to finish paying before the nights go back. */
export const HOLD_MINUTES = 60;
