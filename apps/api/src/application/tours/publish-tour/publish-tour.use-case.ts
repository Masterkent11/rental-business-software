import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import { assertPublishable, type Tour } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayAuthorTours } from '@/application/identity/application-authorization.rules.ts';

export interface PublishOwnerTourInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly tourId: string;
}

export const publishOwnerTour =
  (tours: TourRepository) =>
  async (input: PublishOwnerTourInput): Promise<Tour> => {
    assertMayAuthorTours(input.principal, input.organizationId);
    const tour = await tours.forOrganization(input.organizationId, input.tourId);
    if (!tour) throw new Error('No such tour');

    assertPublishable(tour);

    await tours.setPublished({
      organizationId: input.organizationId,
      tourId: input.tourId,
      published: true,
    });

    return (await tours.forOrganization(
      input.organizationId,
      input.tourId,
    )) as Tour;
  };
