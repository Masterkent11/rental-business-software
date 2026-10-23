import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import {
  ListingNotFoundError,
  ListingPhotoRejectedError,
  type Listing,
} from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerListingGate, type ListingGate } from '@/application/identity/partner-access.rules.ts';

export interface ReorderListingPhotosCommand {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly listingId: string;
  readonly photoIds: readonly string[];
}

export const reorderListingPhotos =
  (listings: ListingRepository, gate: ListingGate = ownerListingGate) =>
  async (command: ReorderListingPhotosCommand): Promise<Listing> => {
    const { organizationId } = await gate({
      principal: command.principal,
      organizationId: command.organizationId,
      listingId: command.listingId,
      permission: 'canEditListing',
    });

    const listing = await listings.findById(organizationId, command.listingId);
    if (!listing) throw new ListingNotFoundError('Listing not found');

    const existing = new Set((listing.media ?? []).map((photo) => photo.id));
    const requested = new Set(command.photoIds);
    if (command.photoIds.length !== existing.size || existing.size !== requested.size || [...requested].some((id) => !existing.has(id))) {
      throw new ListingPhotoRejectedError('The photo order must include every photo exactly once');
    }

    await listings.reorderPhotos(organizationId, command.listingId, command.photoIds);
    const updated = await listings.findById(organizationId, command.listingId);
    if (!updated) throw new ListingNotFoundError('Listing not found');
    return updated;
  };
