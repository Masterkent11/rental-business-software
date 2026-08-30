import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { Listing } from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface ListOwnerListingsInput {
  readonly principal: Principal;
  readonly organizationId: string;
}

export const listOwnerListings =
  (listings: ListingRepository) =>
  async (input: ListOwnerListingsInput): Promise<readonly Listing[]> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    return listings.forOrganization(input.organizationId);
  };
