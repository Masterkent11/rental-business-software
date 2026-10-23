import type { NewNotification } from './notification.ts';

export function bookingConfirmationNotifications(stay: {
  readonly organizationId: string;
  readonly guestId: string | null;
  readonly listingTitle: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly occupancyId: string;
}): readonly NewNotification[] {
  const body = `${stay.listingTitle} · ${stay.startsOn} to ${stay.endsOn}`;
  return [
    { audience: { organizationId: stay.organizationId }, kind: 'BOOKING_RECEIVED', title: 'New booking confirmed', body, link: `/bookings?b=${stay.occupancyId}` },
    ...(stay.guestId ? [{ audience: { userId: stay.guestId }, kind: 'BOOKING_CONFIRMED' as const, title: 'Your booking is confirmed', body, link: `/bookings/${stay.occupancyId}` }] : []),
  ];
}
