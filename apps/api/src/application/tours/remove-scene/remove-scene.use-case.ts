import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import { TourNotFoundError } from '@/application/ports/repositories/tour-repository.port.ts';
import type { MediaStorage } from '@/application/ports/storage/media-storage.port.ts';
import { assertSceneRemovable } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerTourGate, type TourGate } from '@/application/identity/partner-access.rules.ts';

export interface RemoveSceneInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly tourId: string;
  readonly sceneId: string;
  readonly accessToken: string | null;
}

export interface RemoveSceneResult {
  readonly storageCleanup: 'DONE' | 'PENDING';
}

export const removeTourScene =
  (tours: TourRepository, storage: MediaStorage, gate: TourGate = ownerTourGate) =>
  async (input: RemoveSceneInput): Promise<RemoveSceneResult> => {
    const { organizationId } = await gate({ principal: input.principal, organizationId: input.organizationId, tourId: input.tourId });
    const tour = await tours.forOrganization(organizationId, input.tourId);
    if (!tour) throw new TourNotFoundError('No such tour');
    assertSceneRemovable(tour, input.sceneId);

    const { storagePrefix } = await tours.removeScene({ organizationId, tourId: input.tourId, sceneId: input.sceneId });
    await tours.refreshTourState({ organizationId, tourId: input.tourId });

    if (!storagePrefix) return { storageCleanup: 'DONE' };
    try {
      await storage.removePrefix(
        storagePrefix,
        input.accessToken ? { accessToken: input.accessToken } : undefined,
      );
      return { storageCleanup: 'DONE' };
    } catch {
      return { storageCleanup: 'PENDING' };
    }
  };
