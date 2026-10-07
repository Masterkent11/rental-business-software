import type {
  AvailabilityBlock,
  BookingRepository,
} from '@/application/ports/repositories/booking-repository.port.ts';
import type {
  NightAvailability,
  OccupancyRepository,
} from '@/application/ports/repositories/occupancy-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import { ListingNotFoundError } from '@/domain/listings/listing.ts';
import { dateRange, InvalidDateRangeError, nightCount } from '@/domain/occupancy/occupancy.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

const MAX_BLOCK_NIGHTS = 366;
const MAX_CALENDAR_DAYS = 186;

export interface ListingCalendar {
  readonly listingId: string;
  readonly resourceId: string;
  readonly nights: readonly NightAvailability[];
  readonly blocks: readonly AvailabilityBlock[];
}

export const getListingCalendar =
  (listings: ListingRepository, occupancies: OccupancyRepository, bookings: BookingRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly listingId: string;
    readonly from: string;
    readonly to: string;
  }): Promise<ListingCalendar> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const listing = await listings.findById(input.organizationId, input.listingId);
    if (!listing) throw new ListingNotFoundError('Listing not found');

    const range = dateRange(input.from, input.to);
    if (nightCount(range) > MAX_CALENDAR_DAYS) {
      throw new InvalidDateRangeError(`Ask for at most ${MAX_CALENDAR_DAYS} days at a time`);
    }

    const [nights, blocks] = await Promise.all([
      occupancies.nightsFor(listing.resourceId, range),
      bookings.blocksFor(input.organizationId, listing.resourceId),
    ]);
    return { listingId: listing.id, resourceId: listing.resourceId, nights, blocks };
  };

export const addAvailabilityBlock =
  (listings: ListingRepository, bookings: BookingRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly listingId: string;
    readonly startsOn: string;
    readonly endsOn: string;
    readonly note: string | null;
  }): Promise<AvailabilityBlock> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const listing = await listings.findById(input.organizationId, input.listingId);
    if (!listing) throw new ListingNotFoundError('Listing not found');

    const during = dateRange(input.startsOn, input.endsOn);
    if (nightCount(during) > MAX_BLOCK_NIGHTS) {
      throw new InvalidDateRangeError('Blocks are limited to one year at a time');
    }

    return bookings.addBlock({
      organizationId: input.organizationId,
      resourceId: listing.resourceId,
      during,
      note: input.note?.trim() || null,
    });
  };

export const removeAvailabilityBlock =
  (bookings: BookingRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly blockId: string;
  }): Promise<void> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const removed = await bookings.removeBlock(input.organizationId, input.blockId);
    if (!removed) throw new ListingNotFoundError('That block no longer exists');
  };
