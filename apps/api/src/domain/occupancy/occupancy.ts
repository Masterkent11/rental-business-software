import type { OccupancyKind, OccupancyState, DateRange } from './occupancy-state.ts';

export * from './occupancy-state.ts';
export * from './occupancy-rules.ts';
export * from './occupancy-errors.ts';

export interface Occupancy {
  readonly id: string;
  readonly organizationId: string;
  readonly resourceId: string;
  readonly kind: OccupancyKind;
  readonly state: OccupancyState;
  readonly during: DateRange;
  readonly expiresAt: Date | null;
}
