import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { placeHold } from '@/application/bookings/place-hold/place-hold.use-case.ts';
import { ListingNotFoundError } from '@/domain/listings/listing.ts';
import { quoteStay, type StayQuote } from '@/domain/bookings/booking.ts';
import { dateRange, type Occupancy } from '@/domain/occupancy/occupancy.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export interface CreateBookingCommand {
  readonly principal: Principal;
  readonly listingId: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly guests: number;
  readonly idempotencyKey: string | null;
}

export interface CreatedBooking {
  readonly hold: Occupancy;
  readonly quote: StayQuote;
  readonly listingId: string;
}

export const createBooking =
  (listings: ListingRepository, hold: ReturnType<typeof placeHold>) =>
  async (command: CreateBookingCommand): Promise<CreatedBooking> => {
    const pricing = await listings.stayPricing(command.listingId);
    if (!pricing) throw new ListingNotFoundError('This place is not taking nightly bookings');

    const during = dateRange(command.startsOn, command.endsOn);
    const quote = quoteStay(pricing, during, command.guests);

    const occupancy = await hold({
      resourceId: pricing.resourceId,
      startsOn: during.startsOn,
      endsOn: during.endsOn,
      heldBy: command.principal.userId,
      guests: command.guests,
      clientRef: command.idempotencyKey,
    });

    return { hold: occupancy, quote, listingId: command.listingId };
  };
