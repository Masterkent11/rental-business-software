import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayAuthorTours } from '@/application/identity/application-authorization.rules.ts';

export interface ReorderOwnerScenesInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly tourId: string;
  readonly sceneIdsInOrder: readonly string[];
}

export const reorderOwnerScenes =
  (tours: TourRepository) =>
  async (input: ReorderOwnerScenesInput): Promise<void> => {
    assertMayAuthorTours(input.principal, input.organizationId);
    return tours.reorderScenes({
      organizationId: input.organizationId,
      tourId: input.tourId,
      sceneIdsInOrder: input.sceneIdsInOrder,
    });
  };
