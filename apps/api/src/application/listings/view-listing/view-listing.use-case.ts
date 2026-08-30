import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import { isPublic } from '@/domain/listings/listing.ts';
import { PUBLIC } from '@/domain/shared/organization-scope.ts';
import type { ViewListingResult } from './view-listing.types.ts';

export function viewListing(listings: ListingRepository) {
  return async function execute(id: string): Promise<ViewListingResult> {
    const listing = await listings.findPublicById(PUBLIC, id);
    return listing && isPublic(listing) ? listing : null;
  };
}
