import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerTourGate, type TourGate } from '@/application/identity/partner-access.rules.ts';

export interface SetOwnerEntrySceneInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly tourId: string;
  readonly sceneId: string;
}

export const setOwnerEntryScene =
  (tours: TourRepository, gate: TourGate = ownerTourGate) =>
  async (input: SetOwnerEntrySceneInput): Promise<void> => {
    const { organizationId } = await gate({ principal: input.principal, organizationId: input.organizationId, tourId: input.tourId });
    return tours.setEntryScene({ organizationId, tourId: input.tourId, sceneId: input.sceneId });
  };
