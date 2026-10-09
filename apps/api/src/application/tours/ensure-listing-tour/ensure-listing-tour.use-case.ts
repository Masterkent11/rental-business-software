import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import { TourNotFoundError } from '@/application/ports/repositories/tour-repository.port.ts';
import type { Tour } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import type { ListingGate } from '@/application/identity/partner-access.rules.ts';
import { readinessOf, sceneMediaFor, type GetOwnerTourResult } from '@/application/tours/get-owner-tour/get-owner-tour.use-case.ts';
import type { MediaStorage } from '@/application/ports/storage/media-storage.port.ts';

export const ensureListingTour =
  (tours: TourRepository, gate: ListingGate, storage?: MediaStorage) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string | null;
    readonly listingId: string;
  }): Promise<GetOwnerTourResult> => {
    const { organizationId } = await gate({
      principal: input.principal,
      organizationId: input.organizationId,
      listingId: input.listingId,
      permission: 'canManageTour',
    });
    const resourceId = await tours.resourceForListing(organizationId, input.listingId);
    if (!resourceId) throw new TourNotFoundError('No such listing');
    const tour: Tour = await tours.ensureForResource(organizationId, resourceId);
    const media = await sceneMediaFor(tour, storage);
    return { tour, readiness: readinessOf(tour), ...(media ? { media } : {}) };
  };
