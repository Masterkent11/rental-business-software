import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import {
  ListingNotFoundError,
  ListingPhotoRejectedError,
  MIN_LISTING_PHOTOS_TO_PUBLISH,
} from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerListingGate, type ListingGate } from '@/application/identity/partner-access.rules.ts';

export interface RemoveListingPhotoCommand {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly listingId: string;
  readonly photoId: string;
}

export const removeListingPhoto =
  (listings: ListingRepository, gate: ListingGate = ownerListingGate) =>
  async (command: RemoveListingPhotoCommand): Promise<{ readonly storagePath: string | null }> => {
    const { organizationId } = await gate({
      principal: command.principal,
      organizationId: command.organizationId,
      listingId: command.listingId,
      permission: 'canEditListing',
    });

    const listing = await listings.findById(organizationId, command.listingId);
    if (!listing) throw new ListingNotFoundError('Listing not found');

    if (listing.state === 'PUBLISHED' && listing.photos.length <= MIN_LISTING_PHOTOS_TO_PUBLISH) {
      throw new ListingPhotoRejectedError('A published listing needs at least one photo. Add another before removing this one.');
    }

    const removed = await listings.removePhoto(organizationId, command.listingId, command.photoId);
    if (!removed) throw new ListingNotFoundError('Photo not found');
    return removed;
  };
