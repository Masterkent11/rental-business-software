import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { Tour } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerTourGate, type TourGate } from '@/application/identity/partner-access.rules.ts';

export interface CreateOwnerTourForResourceInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly resourceId: string;
}

export const createOwnerTourForResource =
  (tours: TourRepository, gate: TourGate = ownerTourGate) =>
  async (input: CreateOwnerTourForResourceInput): Promise<Tour> => {
    const access = await gate({
      principal: input.principal,
      organizationId: input.organizationId,
      resourceId: input.resourceId,
    });
    return tours.ensureForResource(access.organizationId, input.resourceId);
  };
