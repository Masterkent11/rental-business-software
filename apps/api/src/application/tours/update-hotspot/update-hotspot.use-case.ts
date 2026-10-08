import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import { clampPitch, normaliseYaw } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerTourGate, type TourGate } from '@/application/identity/partner-access.rules.ts';

export interface UpdateHotspotInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly tourId: string;
  readonly hotspotId: string;
  readonly yaw: number;
  readonly pitch: number;
  readonly label: string;
  readonly targetSceneId: string | null;
}

export const updateTourHotspot =
  (tours: TourRepository, gate: TourGate = ownerTourGate) =>
  async (input: UpdateHotspotInput): Promise<void> => {
    const { organizationId } = await gate({ principal: input.principal, organizationId: input.organizationId, tourId: input.tourId });
    await tours.updateHotspot({
      organizationId,
      tourId: input.tourId,
      hotspotId: input.hotspotId,
      yaw: normaliseYaw(input.yaw),
      pitch: clampPitch(input.pitch),
      label: input.label.trim().slice(0, 60),
      targetSceneId: input.targetSceneId,
    });
  };
