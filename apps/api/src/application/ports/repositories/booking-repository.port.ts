import type { BookingBucket, StayState } from '@/domain/bookings/booking.ts';
import type { DateRange } from '@/domain/occupancy/occupancy.ts';

export interface BookingSummary {
  readonly id: string;
  readonly reference: string;
  readonly organizationId: string;
  readonly listingId: string | null;
  readonly listingTitle: string;
  readonly propertyName: string;
  readonly resourceLabel: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly photo: string | null;
  readonly guestId: string | null;
  readonly guestName: string;
  readonly guestEmail: string | null;
  readonly guests: number | null;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly nights: number;
  readonly occupancyState: string;
  readonly stayState: StayState | null;
  readonly paidCentavos: number;
  readonly paymentState: string | null;
  readonly paidAt: Date | null;
  readonly holdExpiresAt: Date | null;
  readonly conversationId: string | null;
  readonly createdAt: Date;
}

export interface BookingWithBucket extends BookingSummary {
  readonly bucket: BookingBucket;
}

export interface OrganizationBookingQuery {
  readonly organizationId: string;
  readonly bucket?: BookingBucket;
  readonly text?: string;
  readonly limit: number;
  readonly offset: number;
}

export interface AvailabilityBlock {
  readonly id: string;
  readonly resourceId: string;
  readonly during: DateRange;
  readonly note: string | null;
}

export class BlockConflictError extends Error {}

export interface BookingRepository {
  forOrganization(query: OrganizationBookingQuery): Promise<{
    readonly items: readonly BookingSummary[];
    readonly total: number;
  }>;
  findForOrganization(organizationId: string, bookingId: string): Promise<BookingSummary | null>;
  forGuest(userId: string): Promise<readonly BookingSummary[]>;
  findForGuest(userId: string, bookingId: string): Promise<BookingSummary | null>;
  setStayState(organizationId: string, bookingId: string, state: StayState): Promise<void>;
  blocksFor(organizationId: string, resourceId: string): Promise<readonly AvailabilityBlock[]>;
  addBlock(input: {
    readonly organizationId: string;
    readonly resourceId: string;
    readonly during: DateRange;
    readonly note: string | null;
  }): Promise<AvailabilityBlock>;
  removeBlock(organizationId: string, blockId: string): Promise<boolean>;
}
