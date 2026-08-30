import type { DomainEvent } from '@/domain/shared/domain-event.ts';

export interface BookingHeldEvent extends DomainEvent {
  readonly eventName: 'BookingHeld';
  readonly bookingId: string;
  readonly resourceId: string;
  readonly heldBy: string;
  readonly startsOn: string;
  readonly endsOn: string;
}

export interface BookingConfirmedEvent extends DomainEvent {
  readonly eventName: 'BookingConfirmed';
  readonly bookingId: string;
  readonly stayId: string;
}
