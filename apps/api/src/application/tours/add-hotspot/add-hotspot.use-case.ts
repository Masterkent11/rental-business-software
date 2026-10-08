import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { HotspotKind } from '@/domain/tours/tour.ts';
import { clampPitch, normaliseYaw } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerTourGate, type TourGate } from '@/application/identity/partner-access.rules.ts';

export interface AddOwnerHotspotInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly tourId: string;
  readonly sceneId: string;
  readonly kind: HotspotKind;
  readonly yaw: number;
  readonly pitch: number;
  readonly label: string;
  readonly targetSceneId: string | null;
}

export const addOwnerHotspot =
  (tours: TourRepository, gate: TourGate = ownerTourGate) =>
  async (input: AddOwnerHotspotInput): Promise<{ id: string }> => {
    const { organizationId } = await gate({ principal: input.principal, organizationId: input.organizationId, tourId: input.tourId });
    const id = await tours.addHotspot({
      organizationId,
      tourId: input.tourId,
      sceneId: input.sceneId,
      kind: input.kind,
      yaw: normaliseYaw(input.yaw),
      pitch: clampPitch(input.pitch),
      label: input.label.trim().slice(0, 60),
      targetSceneId: input.kind === 'NAVIGATION' ? input.targetSceneId : null,
    });
    return { id };
  };
