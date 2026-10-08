import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import { ListingNotFoundError, publishProblems, type Listing } from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import type { ListingGate, PartnerAccess } from '@/application/identity/partner-access.rules.ts';

export interface PartnerListingView {
  readonly listing: Listing;
  readonly publishProblems: readonly string[];
  readonly access: PartnerAccess;
}

export const getPartnerListing =
  (listings: ListingRepository, gate: ListingGate) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string | null;
    readonly listingId: string;
  }): Promise<PartnerListingView> => {
    const access = await gate({
      principal: input.principal,
      organizationId: input.organizationId,
      listingId: input.listingId,
      permission: null,
    });
    const listing = await listings.findById(access.organizationId, input.listingId);
    if (!listing) throw new ListingNotFoundError('Listing not found');
    const verified = await listings.isOrganizationVerified(access.organizationId);
    return { listing, publishProblems: publishProblems(listing, verified), access };
  };
