import { StayTooLongError, InvalidStayTransitionError } from './booking-errors.ts';
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

export type StayState = 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type StayAction = 'CHECK_IN' | 'COMPLETE';

const STAY_TRANSITIONS: Record<StayAction, { from: StayState; to: StayState }> = {
  CHECK_IN: { from: 'CONFIRMED', to: 'IN_PROGRESS' },
  COMPLETE: { from: 'IN_PROGRESS', to: 'COMPLETED' },
};

export function nextStayState(
  current: StayState,
  action: StayAction,
  startsOn: string,
  today: string,
): StayState {
  const rule = STAY_TRANSITIONS[action];
  if (current !== rule.from) {
    throw new InvalidStayTransitionError(
      `A ${current.toLowerCase().replace('_', ' ')} booking cannot be ${action === 'CHECK_IN' ? 'checked in' : 'completed'}.`,
    );
  }
  if (action === 'CHECK_IN' && today < startsOn) {
    throw new InvalidStayTransitionError('Guests can be checked in from the arrival date.');
  }
  return rule.to;
}

export type BookingBucket = 'UPCOMING' | 'CURRENT' | 'PAST' | 'CANCELLED' | 'PENDING_PAYMENT';

export function bookingBucket(input: {
  readonly stayState: StayState | null;
  readonly occupancyState: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly today: string;
}): BookingBucket {
  if (input.stayState === 'CANCELLED' || input.occupancyState === 'CANCELLED') return 'CANCELLED';
  if (input.stayState === null) {
    return input.occupancyState === 'HELD' ? 'PENDING_PAYMENT' : 'CANCELLED';
  }
  if (input.stayState === 'COMPLETED' || input.endsOn <= input.today) return 'PAST';
  if (input.stayState === 'IN_PROGRESS' || input.startsOn <= input.today) return 'CURRENT';
  return 'UPCOMING';
}
