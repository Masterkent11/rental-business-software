import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { Tour } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayAuthorTours } from '@/application/identity/application-authorization.rules.ts';

export interface CreateOwnerTourForResourceInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly resourceId: string;
}

export const createOwnerTourForResource =
  (tours: TourRepository) =>
  async (input: CreateOwnerTourForResourceInput): Promise<Tour> => {
    assertMayAuthorTours(input.principal, input.organizationId);
    return tours.ensureForResource(input.organizationId, input.resourceId);
  };
