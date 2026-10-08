import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import { TourNotFoundError } from '@/application/ports/repositories/tour-repository.port.ts';
import { assertPublishable, type Tour } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerTourGate, type TourGate } from '@/application/identity/partner-access.rules.ts';

export interface PublishOwnerTourInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly tourId: string;
}

export const publishOwnerTour =
  (tours: TourRepository, gate: TourGate = ownerTourGate) =>
  async (input: PublishOwnerTourInput): Promise<Tour> => {
    const { organizationId } = await gate({ principal: input.principal, organizationId: input.organizationId, tourId: input.tourId });
    const tour = await tours.forOrganization(organizationId, input.tourId);
    if (!tour) throw new TourNotFoundError('No such tour');

    assertPublishable(tour);

    await tours.setPublished({ organizationId, tourId: input.tourId, published: true });
    return (await tours.forOrganization(organizationId, input.tourId)) as Tour;
  };
