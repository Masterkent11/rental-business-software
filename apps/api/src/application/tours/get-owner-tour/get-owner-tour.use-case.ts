import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { MediaStorage } from '@/application/ports/storage/media-storage.port.ts';
import { assertPublishable, type Tour } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerTourGate, type TourGate } from '@/application/identity/partner-access.rules.ts';

export interface GetOwnerTourInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly tourId: string;
}

export interface SceneMediaUrls {
  readonly sourceUrl: string | null;
  readonly previewUrl: string | null;
  readonly thumbnailUrl: string | null;
}

export interface GetOwnerTourResult {
  readonly tour: Tour;
  readonly media?: Readonly<Record<string, SceneMediaUrls>>;
  readonly readiness: {
    readonly publishable: boolean;
    readonly problems: string | null;
  };
}

export function readinessOf(tour: Tour): GetOwnerTourResult['readiness'] {
  try {
    assertPublishable(tour);
    return { publishable: true, problems: null };
  } catch (error) {
    return { publishable: false, problems: (error as Error).message };
  }
}

export async function sceneMediaFor(
  tour: Tour,
  storage: MediaStorage | undefined,
): Promise<Readonly<Record<string, SceneMediaUrls>> | undefined> {
  if (!storage) return undefined;
  const url = (path: string | null | undefined) => (path ? storage.createReadUrl(path) : Promise.resolve(null));
  const entries = await Promise.all(
    tour.scenes.map(async (scene) => [
      scene.id,
      {
        sourceUrl: await url(scene.sourcePath),
        previewUrl: await url(scene.previewPath),
        thumbnailUrl: await url(scene.thumbnailPath),
      },
    ] as const),
  );
  return Object.fromEntries(entries);
}

export const getOwnerTourWithReadiness =
  (tours: TourRepository, gate: TourGate = ownerTourGate, storage?: MediaStorage) =>
  async (input: GetOwnerTourInput): Promise<GetOwnerTourResult | null> => {
    const access = await gate({ principal: input.principal, organizationId: input.organizationId, tourId: input.tourId });
    const tour = await tours.forOrganization(access.organizationId, input.tourId);
    if (!tour) return null;
    const media = await sceneMediaFor(tour, storage);
    return { tour, readiness: readinessOf(tour), ...(media ? { media } : {}) };
  };
