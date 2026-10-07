import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import {
  ListingNotFoundError,
  assertPublishable,
  nextListingState,
  type Listing,
  type ListingLifecycleAction,
} from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface SetOwnerListingStateInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly listingId: string;
  readonly action: ListingLifecycleAction;
}

export const setListingState =
  (listings: ListingRepository) =>
  async (input: SetOwnerListingStateInput): Promise<Listing> => {
    assertMayManageOrganization(input.principal, input.organizationId);

    const current = await listings.findById(input.organizationId, input.listingId);
    if (!current) throw new ListingNotFoundError('Listing not found');

    const next = nextListingState(current.state, input.action);
    if (next === 'PUBLISHED') {
      const verified = await listings.isOrganizationVerified(input.organizationId);
      assertPublishable(current, verified);
    }

    const updated = await listings.setListingState(input.organizationId, input.listingId, next);
    if (!updated) throw new ListingNotFoundError('Listing not found');
    return updated;
  };
