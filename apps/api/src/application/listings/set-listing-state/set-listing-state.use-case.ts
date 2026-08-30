import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { Listing } from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface SetOwnerListingStateInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly listingId: string;
  readonly publish: boolean;
}

export const setListingState =
  (listings: ListingRepository) =>
  async (input: SetOwnerListingStateInput): Promise<Listing | null> => {
    assertMayManageOrganization(input.principal, input.organizationId);

    return listings.setListingState(
      input.organizationId,
      input.listingId,
      input.publish ? 'PUBLISHED' : 'UNPUBLISHED',
    );
  };
