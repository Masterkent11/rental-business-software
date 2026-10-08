import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import { ListingNotFoundError } from '@/domain/listings/listing.ts';
import { InquiryNotAllowedError } from '@/domain/inquiries/inquiry.ts';
import { VIEWING_DAYS_AHEAD, viewingDays, type ViewingDay } from '@/domain/viewings/viewing.ts';
import { PUBLIC } from '@/domain/shared/organization-scope.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export const listViewingSlots =
  (listings: ListingRepository, viewings: ViewingRepository, clock: Clock) =>
  async (input: { readonly listingId: string }): Promise<readonly ViewingDay[]> => {
    const listing = await listings.findPublicById(PUBLIC, input.listingId);
    if (!listing || listing.state !== 'PUBLISHED') throw new ListingNotFoundError('That property is no longer listed');
    if (listing.intent !== 'SALE') throw new InquiryNotAllowedError('Viewings are scheduled for properties for sale');
    const now = clock.now();
    const taken = await viewings.takenSlots(
      listing.id,
      now,
      new Date(now.getTime() + (VIEWING_DAYS_AHEAD + 2) * DAY_MS),
    );
    return viewingDays(now, new Set(taken));
  };
