import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayAuthorTours } from '@/application/identity/application-authorization.rules.ts';

export interface RemoveOwnerHotspotInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly hotspotId: string;
}

export const removeOwnerHotspot =
  (tours: TourRepository) =>
  async (input: RemoveOwnerHotspotInput): Promise<void> => {
    assertMayAuthorTours(input.principal, input.organizationId);
    return tours.removeHotspot({
      organizationId: input.organizationId,
      hotspotId: input.hotspotId,
    });
  };
