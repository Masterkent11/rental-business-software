import { localDay } from '@/domain/shared/calendar.ts';
import type {
  BookingRepository,
  BookingWithBucket,
} from '@/application/ports/repositories/booking-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import {
  BookingNotHeldError,
  InvalidStayTransitionError,
  nextStayState,
  type StayAction,
} from '@/domain/bookings/booking.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';
import { withBucket } from '@/application/bookings/get-my-booking/get-my-booking.use-case.ts';

export const updateBookingStatus =
  (bookings: BookingRepository, notifications: NotificationRepository, clock: Clock) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly bookingId: string;
    readonly action: StayAction;
  }): Promise<BookingWithBucket> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const booking = await bookings.findForOrganization(input.organizationId, input.bookingId);
    if (!booking) throw new BookingNotHeldError('Booking not found');
    if (!booking.stayState) {
      throw new InvalidStayTransitionError('Only paid bookings can change status');
    }

    const next = nextStayState(booking.stayState, input.action, booking.startsOn, localDay(clock.now()));
    await bookings.setStayState(input.organizationId, input.bookingId, next);

    if (booking.guestId) {
      await notifications.publish([
        {
          audience: { userId: booking.guestId },
          kind: 'BOOKING_UPDATED',
          title: next === 'IN_PROGRESS' ? 'You are checked in' : 'Your stay is complete',
          body: `${booking.listingTitle} · ${booking.startsOn} to ${booking.endsOn}`,
          link: `/bookings/${booking.id}`,
        },
      ]);
    }

    const updated = await bookings.findForOrganization(input.organizationId, input.bookingId);
    return withBucket(updated ?? { ...booking, stayState: next }, localDay(clock.now()));
  };
