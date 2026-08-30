import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayAuthorTours } from '@/application/identity/application-authorization.rules.ts';

export interface UnpublishOwnerTourInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly tourId: string;
}

export const unpublishOwnerTour =
  (tours: TourRepository) =>
  async (input: UnpublishOwnerTourInput): Promise<void> => {
    assertMayAuthorTours(input.principal, input.organizationId);
    await tours.setPublished({
      organizationId: input.organizationId,
      tourId: input.tourId,
      published: false,
    });
  };
