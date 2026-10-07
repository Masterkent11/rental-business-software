import type { Occupancy } from '@/domain/occupancy/occupancy.ts';

export interface PlaceHoldInput {
  readonly resourceId: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly heldBy: string;
  readonly guests?: number;
  readonly clientRef?: string | null;
}

export type PlaceHoldResult = Occupancy;
