import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { Scene } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayAuthorTours } from '@/application/identity/application-authorization.rules.ts';

export interface RenameOwnerSceneInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly sceneId: string;
  readonly label: string;
}

export const renameOwnerScene =
  (tours: TourRepository) =>
  async (input: RenameOwnerSceneInput): Promise<Scene> => {
    assertMayAuthorTours(input.principal, input.organizationId);
    return tours.renameScene({
      organizationId: input.organizationId,
      sceneId: input.sceneId,
      label: input.label,
    });
  };
