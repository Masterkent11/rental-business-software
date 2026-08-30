import type { Occupancy } from '@/domain/occupancy/occupancy.ts';

export interface PlaceHoldInput {
  readonly resourceId: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly heldBy: string;
}

export type PlaceHoldResult = Occupancy;
