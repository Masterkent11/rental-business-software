import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerTourGate, type TourGate } from '@/application/identity/partner-access.rules.ts';

export interface ReorderOwnerScenesInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly tourId: string;
  readonly sceneIdsInOrder: readonly string[];
}

export const reorderOwnerScenes =
  (tours: TourRepository, gate: TourGate = ownerTourGate) =>
  async (input: ReorderOwnerScenesInput): Promise<void> => {
    const { organizationId } = await gate({ principal: input.principal, organizationId: input.organizationId, tourId: input.tourId });
    return tours.reorderScenes({ organizationId, tourId: input.tourId, sceneIdsInOrder: input.sceneIdsInOrder });
  };
