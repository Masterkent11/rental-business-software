import { localDay } from '@/domain/shared/calendar.ts';
import type {
  BookingRepository,
  BookingSummary,
  BookingWithBucket,
} from '@/application/ports/repositories/booking-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import { BookingNotHeldError, bookingBucket } from '@/domain/bookings/booking.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export function withBucket(booking: BookingSummary, today: string): BookingWithBucket {
  return {
    ...booking,
    bucket: bookingBucket({
      stayState: booking.stayState,
      occupancyState: booking.occupancyState,
      startsOn: booking.startsOn,
      endsOn: booking.endsOn,
      today,
    }),
  };
}

export const getMyBooking =
  (bookings: BookingRepository, clock: Clock) =>
  async (input: { readonly principal: Principal; readonly bookingId: string }): Promise<BookingWithBucket> => {
    const booking = await bookings.findForGuest(input.principal.userId, input.bookingId);
    if (!booking) throw new BookingNotHeldError('Booking not found');
    return withBucket(booking, localDay(clock.now()));
  };
