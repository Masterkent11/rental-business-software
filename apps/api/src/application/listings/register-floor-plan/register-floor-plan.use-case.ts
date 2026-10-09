import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { ListingMediaStorage } from '@/application/ports/storage/listing-media.port.ts';
import {
  ListingNotFoundError,
  ListingPhotoRejectedError,
  assertAcceptablePhoto,
  assertMayAddFloorPlan,
  assertPhotoPathBelongs,
  normaliseFloorPlanLabel,
  type ListingFloorPlan,
} from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import type { ListingGate } from '@/application/identity/partner-access.rules.ts';

export const registerFloorPlan =
  (listings: ListingRepository, media: ListingMediaStorage, gate: ListingGate) =>
  async (command: {
    readonly principal: Principal;
    readonly organizationId: string | null;
    readonly listingId: string;
    readonly storagePath: string;
    readonly label: string;
  }): Promise<ListingFloorPlan> => {
    const { organizationId } = await gate({
      principal: command.principal,
      organizationId: command.organizationId,
      listingId: command.listingId,
      permission: 'canEditListing',
    });
    assertPhotoPathBelongs(command.storagePath, organizationId, command.listingId);
    const label = normaliseFloorPlanLabel(command.label);

    const listing = await listings.findById(organizationId, command.listingId);
    if (!listing) throw new ListingNotFoundError('Listing not found');
    assertMayAddFloorPlan(listing.floorPlans?.length ?? 0);

    const stored = await media.inspect(command.storagePath);
    if (!stored) throw new ListingPhotoRejectedError('The floor plan upload did not finish. Try uploading it again.');
    assertAcceptablePhoto({ contentType: stored.contentType, sizeBytes: stored.sizeBytes, currentCount: 0 });

    return listings.addFloorPlan(
      organizationId,
      command.listingId,
      {
        storagePath: command.storagePath,
        url: media.publicUrl(command.storagePath),
        contentType: stored.contentType,
        sizeBytes: stored.sizeBytes,
      },
      label,
    );
  };
