import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import { assertPublishable, type Tour } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayAuthorTours } from '@/application/identity/application-authorization.rules.ts';

export interface GetOwnerTourInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly tourId: string;
}

export interface GetOwnerTourResult {
  readonly tour: Tour;
  readonly readiness: {
    readonly publishable: boolean;
    readonly problems: string | null;
  };
}

export const getOwnerTourWithReadiness =
  (tours: TourRepository) =>
  async (input: GetOwnerTourInput): Promise<GetOwnerTourResult | null> => {
    assertMayAuthorTours(input.principal, input.organizationId);

    const tour = await tours.forOrganization(input.organizationId, input.tourId);
    if (!tour) return null;

    let readiness: { publishable: boolean; problems: string | null };
    try {
      assertPublishable(tour);
      readiness = { publishable: true, problems: null };
    } catch (error) {
      readiness = { publishable: false, problems: (error as Error).message };
    }

    return { tour, readiness };
  };
