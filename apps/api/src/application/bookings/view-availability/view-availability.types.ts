import type { NightAvailability } from '@/application/ports/repositories/occupancy-repository.port.ts';

export interface ViewAvailabilityInput {
  readonly resourceId: string;
  readonly startsOn: string;
  readonly endsOn: string;
}

export type ViewAvailabilityResult = readonly NightAvailability[];
