import type { Occupancy } from '@/domain/occupancy/occupancy.ts';
import { nightCount } from '@/domain/occupancy/occupancy.ts';
import type { BookingWithBucket } from '@/application/ports/repositories/booking-repository.port.ts';
import type { CreatedBooking } from '@/application/bookings/create-booking/create-booking.use-case.ts';

export const toBookingHttpResponse = (occupancy: Occupancy) => ({
  id: occupancy.id,
  resourceId: occupancy.resourceId,
  state: occupancy.state,
  startsOn: occupancy.during.startsOn,
  endsOn: occupancy.during.endsOn,
  nights: nightCount(occupancy.during),
  expiresAt: occupancy.expiresAt?.toISOString() ?? null,
});

export const toCreatedBookingHttpResponse = (created: CreatedBooking) => ({
  ...toBookingHttpResponse(created.hold),
  listingId: created.listingId,
  quote: {
    nights: created.quote.nights,
    guests: created.quote.guests,
    nightlyCentavos: created.quote.nightlyCentavos,
    lines: created.quote.lines,
    totalCentavos: created.quote.totalCentavos,
    currency: 'PHP',
  },
});

const STATUS_LABEL: Record<BookingWithBucket['bucket'], string> = {
  UPCOMING: 'Confirmed',
  CURRENT: 'Checked in',
  PAST: 'Completed',
  CANCELLED: 'Cancelled',
  PENDING_PAYMENT: 'Awaiting payment',
};

export const toBookingSummaryHttpResponse = (booking: BookingWithBucket, includeGuestContact: boolean) => ({
  id: booking.id,
  reference: booking.reference,
  listingId: booking.listingId,
  listingTitle: booking.listingTitle,
  propertyName: booking.propertyName,
  resourceLabel: booking.resourceLabel,
  areaLabel: booking.areaLabel,
  cityLabel: booking.cityLabel,
  photo: booking.photo,
  guestName: booking.guestName,
  ...(includeGuestContact ? { guestEmail: booking.guestEmail } : {}),
  guests: booking.guests,
  startsOn: booking.startsOn,
  endsOn: booking.endsOn,
  nights: booking.nights,
  bucket: booking.bucket,
  status: booking.stayState ?? (booking.bucket === 'PENDING_PAYMENT' ? 'PENDING_PAYMENT' : 'CANCELLED'),
  statusLabel:
    booking.stayState === 'IN_PROGRESS'
      ? 'Checked in'
      : booking.stayState === 'COMPLETED'
        ? 'Completed'
        : STATUS_LABEL[booking.bucket],
  paidCentavos: booking.paidCentavos,
  paymentState: booking.paymentState,
  paidAt: booking.paidAt?.toISOString() ?? null,
  holdExpiresAt: booking.holdExpiresAt?.toISOString() ?? null,
  conversationId: booking.conversationId,
  createdAt: booking.createdAt.toISOString(),
  allowedActions:
    booking.stayState === 'CONFIRMED'
      ? ['CHECK_IN']
      : booking.stayState === 'IN_PROGRESS'
        ? ['COMPLETE']
        : [],
});
