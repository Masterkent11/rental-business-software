import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import {
  ListingNotFoundError,
  ListingPhotoRejectedError,
  type Listing,
} from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface ReorderListingPhotosCommand {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly listingId: string;
  readonly photoIds: readonly string[];
}

export const reorderListingPhotos =
  (listings: ListingRepository) =>
  async (command: ReorderListingPhotosCommand): Promise<Listing> => {
    assertMayManageOrganization(command.principal, command.organizationId);

    const listing = await listings.findById(command.organizationId, command.listingId);
    if (!listing) throw new ListingNotFoundError('Listing not found');

    const existing = new Set((listing.media ?? []).map((photo) => photo.id));
    const requested = new Set(command.photoIds);
    if (existing.size !== requested.size || [...requested].some((id) => !existing.has(id))) {
      throw new ListingPhotoRejectedError('The photo order must include every photo exactly once');
    }

    await listings.reorderPhotos(command.organizationId, command.listingId, command.photoIds);
    const updated = await listings.findById(command.organizationId, command.listingId);
    if (!updated) throw new ListingNotFoundError('Listing not found');
    return updated;
  };
