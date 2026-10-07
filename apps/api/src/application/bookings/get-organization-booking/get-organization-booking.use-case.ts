import { localDay } from '@/domain/shared/calendar.ts';
import type {
  BookingRepository,
  BookingWithBucket,
} from '@/application/ports/repositories/booking-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import { BookingNotHeldError } from '@/domain/bookings/booking.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';
import { withBucket } from '@/application/bookings/get-my-booking/get-my-booking.use-case.ts';

export const getOrganizationBooking =
  (bookings: BookingRepository, clock: Clock) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly bookingId: string;
  }): Promise<BookingWithBucket> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const booking = await bookings.findForOrganization(input.organizationId, input.bookingId);
    if (!booking) throw new BookingNotHeldError('Booking not found');
    return withBucket(booking, localDay(clock.now()));
  };
