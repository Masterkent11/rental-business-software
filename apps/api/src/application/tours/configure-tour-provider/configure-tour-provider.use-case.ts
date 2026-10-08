import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import { TourNotFoundError } from '@/application/ports/repositories/tour-repository.port.ts';
import type { Tour, TourProvider } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerTourGate, type TourGate } from '@/application/identity/partner-access.rules.ts';

export interface ConfigureTourProviderInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly tourId: string;
  readonly provider: TourProvider;
  readonly matterport?: string | null;
}

export const configureTourProvider =
  (tours: TourRepository, gate: TourGate = ownerTourGate) =>
  async (input: ConfigureTourProviderInput): Promise<Tour> => {
    const { organizationId } = await gate({ principal: input.principal, organizationId: input.organizationId, tourId: input.tourId });
    await tours.setProvider({ organizationId, tourId: input.tourId, provider: 'PLATFORM', externalModelId: null });
    const tour = await tours.forOrganization(organizationId, input.tourId);
    if (!tour) throw new TourNotFoundError('No such tour');
    return tour;
  };
