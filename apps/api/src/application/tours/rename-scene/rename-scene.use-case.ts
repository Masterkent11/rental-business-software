import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import { SceneNotFoundError } from '@/application/ports/repositories/tour-repository.port.ts';
import type { Scene } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerTourGate, type TourGate } from '@/application/identity/partner-access.rules.ts';

export interface RenameOwnerSceneInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly tourId: string;
  readonly sceneId: string;
  readonly label: string;
}

export const renameOwnerScene =
  (tours: TourRepository, gate: TourGate = ownerTourGate) =>
  async (input: RenameOwnerSceneInput): Promise<Scene> => {
    const { organizationId } = await gate({ principal: input.principal, organizationId: input.organizationId, tourId: input.tourId });
    const label = input.label.replace(/\s+/g, ' ').trim();
    if (label.length < 1 || label.length > 60) throw new SceneNotFoundError('Name the room in 1 to 60 characters');
    return tours.renameScene({ organizationId, tourId: input.tourId, sceneId: input.sceneId, label });
  };
