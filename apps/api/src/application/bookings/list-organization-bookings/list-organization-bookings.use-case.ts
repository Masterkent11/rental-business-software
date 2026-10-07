import { localDay } from '@/domain/shared/calendar.ts';
import type {
  BookingRepository,
  BookingWithBucket,
} from '@/application/ports/repositories/booking-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { BookingBucket } from '@/domain/bookings/booking.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';
import { withBucket } from '@/application/bookings/get-my-booking/get-my-booking.use-case.ts';

export const listOrganizationBookings =
  (bookings: BookingRepository, clock: Clock) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly bucket?: BookingBucket;
    readonly text?: string;
    readonly limit: number;
    readonly offset: number;
  }): Promise<{ readonly items: readonly BookingWithBucket[]; readonly total: number }> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const page = await bookings.forOrganization({
      organizationId: input.organizationId,
      ...(input.bucket ? { bucket: input.bucket } : {}),
      ...(input.text ? { text: input.text } : {}),
      limit: input.limit,
      offset: input.offset,
    });
    const today = localDay(clock.now());
    return { items: page.items.map((b) => withBucket(b, today)), total: page.total };
  };
