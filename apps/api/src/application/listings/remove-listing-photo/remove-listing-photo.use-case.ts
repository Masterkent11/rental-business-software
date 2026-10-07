import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import {
  ListingNotFoundError,
  ListingPhotoRejectedError,
  MIN_LISTING_PHOTOS_TO_PUBLISH,
} from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface RemoveListingPhotoCommand {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly listingId: string;
  readonly photoId: string;
}

export const removeListingPhoto =
  (listings: ListingRepository) =>
  async (command: RemoveListingPhotoCommand): Promise<{ readonly storagePath: string | null }> => {
    assertMayManageOrganization(command.principal, command.organizationId);

    const listing = await listings.findById(command.organizationId, command.listingId);
    if (!listing) throw new ListingNotFoundError('Listing not found');

    if (listing.state === 'PUBLISHED' && listing.photos.length <= MIN_LISTING_PHOTOS_TO_PUBLISH) {
      throw new ListingPhotoRejectedError('A published listing needs at least one photo. Add another before removing this one.');
    }

    const removed = await listings.removePhoto(command.organizationId, command.listingId, command.photoId);
    if (!removed) throw new ListingNotFoundError('Photo not found');
    return removed;
  };
