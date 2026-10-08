import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import { ListingNotFoundError } from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import type { ListingGate } from '@/application/identity/partner-access.rules.ts';

export const removeFloorPlan =
  (listings: ListingRepository, gate: ListingGate) =>
  async (command: {
    readonly principal: Principal;
    readonly organizationId: string | null;
    readonly listingId: string;
    readonly floorPlanId: string;
  }): Promise<{ readonly storagePath: string | null }> => {
    const { organizationId } = await gate({
      principal: command.principal,
      organizationId: command.organizationId,
      listingId: command.listingId,
      permission: 'canEditListing',
    });
    const removed = await listings.removeFloorPlan(organizationId, command.listingId, command.floorPlanId);
    if (!removed) throw new ListingNotFoundError('Floor plan not found');
    return removed;
  };
