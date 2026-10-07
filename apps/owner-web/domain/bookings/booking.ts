export type BookingBucket = "UPCOMING" | "CURRENT" | "PAST" | "CANCELLED" | "PENDING_PAYMENT";

export type BookingAction = "CHECK_IN" | "COMPLETE";

export interface OwnerBooking {
  readonly id: string;
  readonly reference: string;
  readonly listingId: string | null;
  readonly listingTitle: string;
  readonly propertyName: string;
  readonly resourceLabel: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly photo: string | null;
  readonly guestName: string;
  readonly guestEmail: string | null;
  readonly guests: number | null;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly nights: number;
  readonly bucket: BookingBucket;
  readonly status: string;
  readonly statusLabel: string;
  readonly paidCentavos: number;
  readonly paymentState: string | null;
  readonly paidAt: string | null;
  readonly holdExpiresAt: string | null;
  readonly conversationId: string | null;
  readonly createdAt: string;
  readonly allowedActions: readonly BookingAction[];
}

export interface BookingPage {
  readonly items: readonly OwnerBooking[];
  readonly total: number;
}

export const BOOKING_BUCKETS: readonly { value: BookingBucket | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "CURRENT", label: "Checked in" },
  { value: "PENDING_PAYMENT", label: "Awaiting payment" },
  { value: "PAST", label: "Past" },
  { value: "CANCELLED", label: "Cancelled" },
];
