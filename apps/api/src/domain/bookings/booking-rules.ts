import { StayTooLongError } from './booking-errors.ts';
import type { DateRange } from '@/domain/occupancy/occupancy.ts';
import { nightCount } from '@/domain/occupancy/occupancy.ts';

export const MAX_NIGHTS = 90;

export function assertValidStayDuration(during: DateRange): void {
  if (nightCount(during) > MAX_NIGHTS) {
    throw new StayTooLongError(
      `A stay may be at most ${MAX_NIGHTS} nights. Longer arrangements are leases.`,
    );
  }
}
