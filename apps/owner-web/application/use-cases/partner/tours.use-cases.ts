import type { PartnerRepositoryPort } from "../../ports/partner-repository.port";
import type { FileReaderPort } from "../../ports/file-reader.port";
import type { PartnerScope } from "../../../domain/workspace/workspace";
import {
  panoramaProblem,
  panoramaShapeProblem,
  type StudioTour,
  type TourOverview,
  type TourScene,
} from "../../../domain/tours/tour";

export class LoadTourOverviewUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(organizationId: string): Promise<readonly TourOverview[]> {
    return this.repository.getTourOverview(organizationId);
  }
}

export class OpenListingTourUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(scope: PartnerScope, listingId: string): Promise<StudioTour> {
    return this.repository.ensureListingTour(scope, listingId);
  }
}

export class LoadTourUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(scope: PartnerScope, tourId: string): Promise<StudioTour> {
    return this.repository.getTour(scope, tourId);
  }
}

export class ConfigureTourProviderUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(scope: PartnerScope, tourId: string): Promise<void> {
    return this.repository.configureTourProvider(scope, tourId, "PLATFORM", null);
  }
}

export class AddTourSceneUseCase {
  constructor(
    private readonly repository: PartnerRepositoryPort,
    private readonly files: FileReaderPort,
  ) {}

  async execute(scope: PartnerScope, tourId: string, label: string, file: File): Promise<TourScene> {
    if (!label.trim()) throw new Error("Name the room");
    const problem = panoramaProblem(file);
    if (problem) throw new Error(problem);
    const size = await this.files.imageSize(file);
    const shape = panoramaShapeProblem(size.width, size.height);
    if (shape) throw new Error(shape);
    const base64 = await this.files.readBase64(file);
    return this.repository.addTourScene(scope, tourId, label.trim(), base64);
  }
}

export class EditTourUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}

  rename(scope: PartnerScope, tourId: string, sceneId: string, label: string) {
    if (!label.trim()) throw new Error("Name the room");
    return this.repository.renameTourScene(scope, tourId, sceneId, label.trim());
  }

  removeScene(scope: PartnerScope, tourId: string, sceneId: string) {
    return this.repository.removeTourScene(scope, tourId, sceneId);
  }

  reorder(scope: PartnerScope, tourId: string, sceneIds: readonly string[]) {
    return this.repository.reorderTourScenes(scope, tourId, sceneIds);
  }

  setEntry(scope: PartnerScope, tourId: string, sceneId: string) {
    return this.repository.setTourEntryScene(scope, tourId, sceneId);
  }

  setView(scope: PartnerScope, tourId: string, sceneId: string, view: { yaw: number; pitch: number; fov: number }) {
    return this.repository.setSceneView(scope, tourId, sceneId, {
      yaw: Math.round(view.yaw * 10) / 10,
      pitch: Math.max(-85, Math.min(85, Math.round(view.pitch * 10) / 10)),
      fov: Math.max(30, Math.min(110, Math.round(view.fov))),
    });
  }

  addHotspot(
    scope: PartnerScope,
    tourId: string,
    sceneId: string,
    hotspot: { kind: "NAVIGATION" | "INFO"; yaw: number; pitch: number; label: string; targetSceneId: string | null },
  ) {
    if (hotspot.kind === "NAVIGATION" && !hotspot.targetSceneId) throw new Error("Choose the room this door leads to");
    if (hotspot.kind === "INFO" && !hotspot.label.trim()) throw new Error("Write the note to show");
    return this.repository.addHotspot(scope, tourId, sceneId, hotspot);
  }

  updateHotspot(
    scope: PartnerScope,
    tourId: string,
    hotspotId: string,
    hotspot: { yaw: number; pitch: number; label: string; targetSceneId: string | null },
  ) {
    return this.repository.updateHotspot(scope, tourId, hotspotId, hotspot);
  }

  removeHotspot(scope: PartnerScope, tourId: string, hotspotId: string) {
    return this.repository.removeHotspot(scope, tourId, hotspotId);
  }

  publish(scope: PartnerScope, tourId: string) {
    return this.repository.publishTour(scope, tourId);
  }

  unpublish(scope: PartnerScope, tourId: string) {
    return this.repository.unpublishTour(scope, tourId);
  }
}
