import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import {
  ListingNotFoundError,
  publishProblems,
  type Listing,
} from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface OwnerListingView {
  readonly listing: Listing;
  readonly publishProblems: readonly string[];
}

export const getOwnerListing =
  (listings: ListingRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly listingId: string;
  }): Promise<OwnerListingView> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const listing = await listings.findById(input.organizationId, input.listingId);
    if (!listing) throw new ListingNotFoundError('Listing not found');
    const verified = await listings.isOrganizationVerified(input.organizationId);
    return { listing, publishProblems: publishProblems(listing, verified) };
  };
