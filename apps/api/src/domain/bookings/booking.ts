import type { AggregateRoot } from '@/domain/shared/aggregate-root.ts';
import type { BookingState } from './booking-state.ts';
import type { Centavos } from '@/domain/shared/money.ts';
import type { DateRange } from '@/domain/occupancy/occupancy.ts';

export * from './booking-state.ts';
export * from './booking-rules.ts';
export * from './booking-errors.ts';
export * from './booking-events.ts';

export interface Booking extends AggregateRoot<string> {
  readonly id: string;
  readonly resourceId: string;
  readonly heldBy: string;
  readonly during: DateRange;
  readonly state: BookingState;
  readonly amountCentavos: Centavos;
  readonly expiresAt: Date | null;
}
