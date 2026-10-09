import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import { assertInitialView, normaliseYaw } from '@/domain/tours/tour.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { ownerTourGate, type TourGate } from '@/application/identity/partner-access.rules.ts';

export interface SetSceneViewInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly tourId: string;
  readonly sceneId: string;
  readonly yaw: number;
  readonly pitch: number;
  readonly fov: number;
}

export const setSceneView =
  (tours: TourRepository, gate: TourGate = ownerTourGate) =>
  async (input: SetSceneViewInput): Promise<void> => {
    const { organizationId } = await gate({ principal: input.principal, organizationId: input.organizationId, tourId: input.tourId });
    const view = { yaw: normaliseYaw(input.yaw), pitch: input.pitch, fov: input.fov };
    assertInitialView(view);
    await tours.setSceneView({ organizationId, tourId: input.tourId, sceneId: input.sceneId, ...view });
  };
