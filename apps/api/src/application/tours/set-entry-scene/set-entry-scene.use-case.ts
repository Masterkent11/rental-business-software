import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayAuthorTours } from '@/application/identity/application-authorization.rules.ts';

export interface SetOwnerEntrySceneInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly tourId: string;
  readonly sceneId: string;
}

export const setOwnerEntryScene =
  (tours: TourRepository) =>
  async (input: SetOwnerEntrySceneInput): Promise<void> => {
    assertMayAuthorTours(input.principal, input.organizationId);
    return tours.setEntryScene({
      organizationId: input.organizationId,
      tourId: input.tourId,
      sceneId: input.sceneId,
    });
  };
