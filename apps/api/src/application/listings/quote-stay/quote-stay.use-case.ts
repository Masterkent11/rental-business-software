import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { OccupancyRepository } from '@/application/ports/repositories/occupancy-repository.port.ts';
import { ListingNotFoundError } from '@/domain/listings/listing.ts';
import { quoteStay, type StayQuote } from '@/domain/bookings/booking.ts';
import { dateRange } from '@/domain/occupancy/occupancy.ts';

export interface StayQuoteResult extends StayQuote {
  readonly listingId: string;
  readonly available: boolean;
  readonly takenNights: readonly string[];
}

export const quoteStayForListing =
  (listings: ListingRepository, occupancies: OccupancyRepository) =>
  async (input: {
    readonly listingId: string;
    readonly startsOn: string;
    readonly endsOn: string;
    readonly guests: number;
  }): Promise<StayQuoteResult> => {
    const pricing = await listings.stayPricing(input.listingId);
    if (!pricing) throw new ListingNotFoundError('This place is not taking nightly bookings');

    const during = dateRange(input.startsOn, input.endsOn);
    const quote = quoteStay(pricing, during, input.guests);
    const nights = await occupancies.nightsFor(pricing.resourceId, during);
    const takenNights = nights.filter((night) => night.status !== 'OPEN').map((night) => night.night);

    return {
      ...quote,
      listingId: input.listingId,
      available: takenNights.length === 0,
      takenNights,
    };
  };
