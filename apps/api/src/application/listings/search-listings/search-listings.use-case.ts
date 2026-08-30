import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import { isPublic } from '@/domain/listings/listing.ts';
import { PUBLIC } from '@/domain/shared/organization-scope.ts';
import type {
  SearchListingsInput,
  SearchListingsResult,
} from './search-listings.types.ts';

export function searchListings(listings: ListingRepository) {
  return async function execute(
    query: SearchListingsInput,
  ): Promise<SearchListingsResult> {
    const found = await listings.search(PUBLIC, query);
    return found.filter(isPublic);
  };
}
