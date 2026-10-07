import { localDay } from '@/domain/shared/calendar.ts';
import type {
  BookingRepository,
  BookingWithBucket,
} from '@/application/ports/repositories/booking-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { withBucket } from '@/application/bookings/get-my-booking/get-my-booking.use-case.ts';

export const listMyBookings =
  (bookings: BookingRepository, clock: Clock) =>
  async (input: { readonly principal: Principal }): Promise<readonly BookingWithBucket[]> => {
    const rows = await bookings.forGuest(input.principal.userId);
    const today = localDay(clock.now());
    return rows
      .map((row) => withBucket(row, today))
      .filter((row) => row.bucket !== 'CANCELLED' || row.stayState !== null);
  };
