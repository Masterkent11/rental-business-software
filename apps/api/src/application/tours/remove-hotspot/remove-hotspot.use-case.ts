import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerTourGate, type TourGate } from '@/application/identity/partner-access.rules.ts';

export interface RemoveOwnerHotspotInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly tourId: string;
  readonly hotspotId: string;
}

export const removeOwnerHotspot =
  (tours: TourRepository, gate: TourGate = ownerTourGate) =>
  async (input: RemoveOwnerHotspotInput): Promise<void> => {
    const { organizationId } = await gate({ principal: input.principal, organizationId: input.organizationId, tourId: input.tourId });
    return tours.removeHotspot({ organizationId, tourId: input.tourId, hotspotId: input.hotspotId });
  };
