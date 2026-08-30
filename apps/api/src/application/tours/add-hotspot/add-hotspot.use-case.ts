import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { HotspotKind } from '@/domain/tours/tour.ts';
import { clampPitch, normaliseYaw } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayAuthorTours } from '@/application/identity/application-authorization.rules.ts';

export interface AddOwnerHotspotInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly sceneId: string;
  readonly kind: HotspotKind;
  readonly yaw: number;
  readonly pitch: number;
  readonly label: string;
  readonly targetSceneId: string | null;
}

export const addOwnerHotspot =
  (tours: TourRepository) =>
  async (input: AddOwnerHotspotInput): Promise<{ id: string }> => {
    assertMayAuthorTours(input.principal, input.organizationId);
    const id = await tours.addHotspot({
      organizationId: input.organizationId,
      sceneId: input.sceneId,
      kind: input.kind,
      yaw: normaliseYaw(input.yaw),
      pitch: clampPitch(input.pitch),
      label: input.label,
      targetSceneId: input.targetSceneId,
    });
    return { id };
  };
