import type { Listing, ListingQuery } from '../../domain/listings/listing.ts';
import { isPublic } from '../../domain/listings/listing.ts';
import type { ListingRepository } from '../../application/ports/listing-repository.ts';
import { PUBLIC } from '../../domain/shared/organization-scope.ts';

/**
 * Search the marketplace.
 *
 * Anyone may run this, signed in or not — discovery is the top of the funnel
 * and gating it would be gating the product.
 *
 * The `isPublic` filter here is deliberate belt-and-braces. The repository
 * already restricts to published rows; this makes the rule visible in the layer
 * that owns it, and it means a future adapter that forgets cannot leak a draft
 * listing to a customer.
 */
export const searchListings =
  (listings: ListingRepository) =>
  async (query: ListingQuery): Promise<readonly Listing[]> => {
    const found = await listings.search(PUBLIC, query);
    return found.filter(isPublic);
  };

export const viewListing =
  (listings: ListingRepository) =>
  async (id: string): Promise<Listing | null> => {
    const listing = await listings.findPublicById(PUBLIC, id);
    return listing && isPublic(listing) ? listing : null;
  };
