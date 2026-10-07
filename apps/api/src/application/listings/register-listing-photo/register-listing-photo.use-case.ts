import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { ListingMediaStorage } from '@/application/ports/storage/listing-media.port.ts';
import {
  ListingNotFoundError,
  ListingPhotoRejectedError,
  assertAcceptablePhoto,
  assertPhotoPathBelongs,
  type ListingPhoto,
} from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface RegisterListingPhotoCommand {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly listingId: string;
  readonly storagePath: string;
}

export const registerListingPhoto =
  (listings: ListingRepository, media: ListingMediaStorage) =>
  async (command: RegisterListingPhotoCommand): Promise<ListingPhoto> => {
    assertMayManageOrganization(command.principal, command.organizationId);
    assertPhotoPathBelongs(command.storagePath, command.organizationId, command.listingId);

    const listing = await listings.findById(command.organizationId, command.listingId);
    if (!listing) throw new ListingNotFoundError('Listing not found');

    const stored = await media.inspect(command.storagePath);
    if (!stored) {
      throw new ListingPhotoRejectedError('The photo upload did not finish. Try uploading it again.');
    }

    assertAcceptablePhoto({
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      currentCount: listing.photos.length,
    });

    return listings.addPhoto(command.organizationId, command.listingId, {
      storagePath: command.storagePath,
      url: media.publicUrl(command.storagePath),
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
    });
  };
