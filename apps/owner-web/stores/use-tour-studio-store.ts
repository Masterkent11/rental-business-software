import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { PartnerScope } from "../domain/workspace/workspace";
import type { StudioTour, TourHotspot, TourOverview } from "../domain/tours/tour";

export interface CameraView {
  yaw: number;
  pitch: number;
  fov: number;
}

export interface HotspotDraft {
  kind: "NAVIGATION" | "INFO";
  yaw: number;
  pitch: number;
  label: string;
  targetSceneId: string | null;
}

type Mode = "look" | "place" | "move";

interface TourStudioState {
  scope: PartnerScope | null;
  listingId: string | null;
  tour: StudioTour | null;
  loading: boolean;
  loadError: string | null;
  sceneId: string | null;
  camera: CameraView;
  mode: Mode;
  draft: HotspotDraft | null;
  movingHotspotId: string | null;
  selectedHotspotId: string | null;
  renameDraft: string;
  uploadLabel: string;
  uploading: boolean;
  uploadError: string | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
  confirmRemoveSceneId: string | null;
  pollTimer: ReturnType<typeof setTimeout> | null;
  overview: readonly TourOverview[];
  overviewLoaded: boolean;
  overviewError: string | null;
  viewport: { width: number; height: number };
  imageState: "loading" | "ready" | "failed";
  fullscreen: boolean;

  setViewport: (size: { width: number; height: number }) => void;
  setImageState: (state: "loading" | "ready" | "failed") => void;
  setFullscreen: (value: boolean) => void;
  loadOverview: (organizationId: string) => Promise<void>;
  open: (scope: PartnerScope, listingId: string) => Promise<void>;
  close: () => void;
  refresh: () => Promise<void>;
  selectScene: (sceneId: string) => void;
  setCamera: (camera: CameraView) => void;
  setMode: (mode: Mode) => void;
  placeAt: (yaw: number, pitch: number) => Promise<void>;
  setDraft: (patch: Partial<HotspotDraft>) => void;
  cancelDraft: () => void;
  saveDraft: () => Promise<void>;
  selectHotspot: (id: string | null) => void;
  startMove: (id: string) => void;
  updateHotspot: (hotspot: TourHotspot, patch: Partial<Pick<TourHotspot, "label" | "targetSceneId">>) => Promise<void>;
  removeHotspot: (id: string) => Promise<void>;
  setRenameDraft: (value: string) => void;
  renameScene: () => Promise<void>;
  moveScene: (sceneId: string, direction: -1 | 1) => Promise<void>;
  setEntry: (sceneId: string) => Promise<void>;
  saveInitialView: () => Promise<void>;
  askRemoveScene: (sceneId: string | null) => void;
  removeScene: () => Promise<void>;
  setUploadLabel: (value: string) => void;
  addScene: (file: File) => Promise<void>;
  replaceScene: (file: File) => Promise<void>;
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
}

const messageOf = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const DEFAULT_CAMERA: CameraView = { yaw: 0, pitch: 0, fov: 75 };

const cameraFor = (tour: StudioTour | null, sceneId: string | null): CameraView => {
  const scene = tour?.scenes.find((s) => s.id === sceneId);
  return scene ? { yaw: scene.initialYaw, pitch: scene.initialPitch, fov: scene.initialFov } : DEFAULT_CAMERA;
};

export const useTourStudioStore = create<TourStudioState>((set, get) => {
  const run = async (work: () => Promise<unknown>, fallback: string, notice: string | null = null) => {
    const { scope, tour } = get();
    if (!scope || !tour) return false;
    set({ busy: true, error: null, notice: null });
    try {
      await work();
      await get().refresh();
      set({ busy: false, notice });
      return true;
    } catch (error) {
      set({ busy: false, error: messageOf(error, fallback) });
      return false;
    }
  };

  const schedulePoll = () => {
    const { tour, pollTimer } = get();
    if (pollTimer) clearTimeout(pollTimer);
    const processing = tour?.scenes.some((s) => s.state === "PROCESSING" || s.state === "UPLOADING") ?? false;
    set({ pollTimer: processing ? setTimeout(() => void get().refresh(), 3000) : null });
  };

  return {
    scope: null,
    listingId: null,
    tour: null,
    loading: false,
    loadError: null,
    sceneId: null,
    camera: DEFAULT_CAMERA,
    mode: "look",
    draft: null,
    movingHotspotId: null,
    selectedHotspotId: null,
    renameDraft: "",
    uploadLabel: "",
    uploading: false,
    uploadError: null,
    busy: false,
    error: null,
    notice: null,
    confirmRemoveSceneId: null,
    pollTimer: null,
    overview: [],
    overviewLoaded: false,
    overviewError: null,
    viewport: { width: 0, height: 0 },
    imageState: "loading",
    fullscreen: false,

    setViewport: (viewport) => set({ viewport }),
    setImageState: (imageState) => set({ imageState }),
    setFullscreen: (fullscreen) => set({ fullscreen }),

    loadOverview: async (organizationId) => {
      try {
        const overview = await container.loadTourOverviewUseCase.execute(organizationId);
        set({ overview, overviewLoaded: true, overviewError: null });
      } catch (error) {
        set({ overviewLoaded: true, overviewError: messageOf(error, "Could not load tours") });
      }
    },

    open: async (scope, listingId) => {
      get().close();
      set({ scope, listingId, loading: true, loadError: null });
      try {
        const tour = await container.openListingTourUseCase.execute(scope, listingId);
        const sceneId = tour.entrySceneId ?? tour.scenes[0]?.id ?? null;
        set({
          tour,
          loading: false,
          sceneId,
          camera: cameraFor(tour, sceneId),
          renameDraft: tour.scenes.find((s) => s.id === sceneId)?.label ?? "",
        });
        schedulePoll();
      } catch (error) {
        set({ loading: false, loadError: messageOf(error, "Could not open the tour") });
      }
    },

    close: () => {
      const timer = get().pollTimer;
      if (timer) clearTimeout(timer);
      set({
        tour: null,
        sceneId: null,
        pollTimer: null,
        mode: "look",
        draft: null,
        movingHotspotId: null,
        selectedHotspotId: null,
        error: null,
        notice: null,
        uploadError: null,
        confirmRemoveSceneId: null,
      });
    },

    refresh: async () => {
      const { scope, tour } = get();
      if (!scope || !tour) return;
      try {
        const next = await container.loadTourUseCase.execute(scope, tour.id);
        const sceneId = next.scenes.some((s) => s.id === get().sceneId) ? get().sceneId : (next.entrySceneId ?? next.scenes[0]?.id ?? null);
        set({ tour: next, sceneId });
        schedulePoll();
      } catch (error) {
        set({ error: messageOf(error, "Could not refresh the tour") });
      }
    },

    selectScene: (sceneId) => {
      const tour = get().tour;
      set({
        sceneId,
        camera: cameraFor(tour, sceneId),
        mode: "look",
        draft: null,
        movingHotspotId: null,
        selectedHotspotId: null,
        renameDraft: tour?.scenes.find((s) => s.id === sceneId)?.label ?? "",
        notice: null,
      });
    },

    setCamera: (camera) => set({ camera }),
    setMode: (mode) => set({ mode, draft: null, movingHotspotId: mode === "move" ? get().movingHotspotId : null }),

    placeAt: async (yaw, pitch) => {
      const { mode, movingHotspotId, tour, sceneId } = get();
      if (mode === "place") {
        const target = tour?.scenes.find((s) => s.id !== sceneId)?.id ?? null;
        set({ draft: { kind: target ? "NAVIGATION" : "INFO", yaw, pitch, label: "", targetSceneId: target } });
        return;
      }
      if (mode === "move" && movingHotspotId) {
        const hotspot = tour?.scenes.flatMap((s) => s.hotspots).find((h) => h.id === movingHotspotId);
        if (!hotspot) return;
        const { scope } = get();
        await run(
          () => container.editTourUseCase.updateHotspot(scope!, tour!.id, hotspot.id, { yaw, pitch, label: hotspot.label, targetSceneId: hotspot.targetSceneId }),
          "Could not move that hotspot",
          "Hotspot moved",
        );
        set({ mode: "look", movingHotspotId: null });
      }
    },

    setDraft: (patch) => set((state) => ({ draft: state.draft ? { ...state.draft, ...patch } : state.draft })),
    cancelDraft: () => set({ draft: null }),

    saveDraft: async () => {
      const { draft, scope, tour, sceneId } = get();
      if (!draft || !sceneId) return;
      const ok = await run(() => container.editTourUseCase.addHotspot(scope!, tour!.id, sceneId, draft), "Could not add the hotspot", "Hotspot added");
      if (ok) set({ draft: null, mode: "look" });
    },

    selectHotspot: (selectedHotspotId) => set({ selectedHotspotId, draft: null }),
    startMove: (id) => set({ mode: "move", movingHotspotId: id, draft: null, notice: "Click where the hotspot should go" }),

    updateHotspot: async (hotspot, patch) => {
      const { scope, tour } = get();
      await run(
        () =>
          container.editTourUseCase.updateHotspot(scope!, tour!.id, hotspot.id, {
            yaw: hotspot.yaw,
            pitch: hotspot.pitch,
            label: patch.label ?? hotspot.label,
            targetSceneId: patch.targetSceneId === undefined ? hotspot.targetSceneId : patch.targetSceneId,
          }),
        "Could not update the hotspot",
      );
    },

    removeHotspot: async (id) => {
      const { scope, tour } = get();
      const ok = await run(() => container.editTourUseCase.removeHotspot(scope!, tour!.id, id), "Could not remove the hotspot", "Hotspot removed");
      if (ok) set({ selectedHotspotId: null });
    },

    setRenameDraft: (renameDraft) => set({ renameDraft }),

    renameScene: async () => {
      const { scope, tour, sceneId, renameDraft } = get();
      if (!sceneId) return;
      await run(() => container.editTourUseCase.rename(scope!, tour!.id, sceneId, renameDraft), "Could not rename the room", "Room renamed");
    },

    moveScene: async (sceneId, direction) => {
      const { scope, tour } = get();
      if (!tour) return;
      const ids = tour.scenes.map((s) => s.id);
      const index = ids.indexOf(sceneId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= ids.length) return;
      [ids[index], ids[target]] = [ids[target]!, ids[index]!];
      await run(() => container.editTourUseCase.reorder(scope!, tour.id, ids), "Could not reorder rooms");
    },

    setEntry: async (sceneId) => {
      const { scope, tour } = get();
      await run(() => container.editTourUseCase.setEntry(scope!, tour!.id, sceneId), "Could not set the first room", "Tour now starts in this room");
    },

    saveInitialView: async () => {
      const { scope, tour, sceneId, camera } = get();
      if (!sceneId) return;
      await run(() => container.editTourUseCase.setView(scope!, tour!.id, sceneId, camera), "Could not save the starting view", "Starting view saved");
    },

    askRemoveScene: (confirmRemoveSceneId) => set({ confirmRemoveSceneId, error: null }),

    removeScene: async () => {
      const { scope, tour, confirmRemoveSceneId } = get();
      if (!confirmRemoveSceneId) return;
      const ok = await run(() => container.editTourUseCase.removeScene(scope!, tour!.id, confirmRemoveSceneId), "Could not delete the room", "Room deleted");
      if (ok) {
        const next = get().tour;
        const sceneId = next?.entrySceneId ?? next?.scenes[0]?.id ?? null;
        set({ confirmRemoveSceneId: null, sceneId, camera: cameraFor(next, sceneId), renameDraft: next?.scenes.find((s) => s.id === sceneId)?.label ?? "" });
      }
    },

    setUploadLabel: (uploadLabel) => set({ uploadLabel, uploadError: null }),

    addScene: async (file) => {
      const { scope, tour, uploadLabel } = get();
      if (!scope || !tour) return;
      set({ uploading: true, uploadError: null, notice: null });
      try {
        const scene = await container.addTourSceneUseCase.execute(scope, tour.id, uploadLabel, file);
        set({ uploading: false, uploadLabel: "" });
        await get().refresh();
        get().selectScene(scene.id);
      } catch (error) {
        set({ uploading: false, uploadError: messageOf(error, "Could not upload that 360° photo") });
      }
    },

    replaceScene: async (file: File) => {
      const { scope, tour, sceneId } = get();
      if (!scope || !tour || !sceneId) return;
      const current = tour.scenes.find((s) => s.id === sceneId);
      if (!current) return;
      set({ uploading: true, uploadError: null, notice: null });
      try {
        const newScene = await container.addTourSceneUseCase.execute(scope, tour.id, current.label, file);
        const wasEntry = tour.entrySceneId === current.id;
        if (wasEntry) {
          await container.editTourUseCase.setEntry(scope, tour.id, newScene.id);
        }
        for (const h of current.hotspots) {
          try {
            await container.editTourUseCase.addHotspot(scope, tour.id, newScene.id, {
              kind: h.kind,
              yaw: h.yaw,
              pitch: h.pitch,
              label: h.label,
              targetSceneId: h.targetSceneId,
            });
          } catch {}
        }
        await container.editTourUseCase.removeScene(scope, tour.id, current.id);
        set({ uploading: false, notice: "Room 360° photo replaced" });
        await get().refresh();
        get().selectScene(newScene.id);
      } catch (error) {
        set({ uploading: false, uploadError: messageOf(error, "Could not replace the 360° photo") });
      }
    },

    publish: async () => {
      const { scope, tour } = get();
      await run(() => container.editTourUseCase.publish(scope!, tour!.id), "Could not publish the tour", "Tour published. Customers can open it from the listing.");
    },

    unpublish: async () => {
      const { scope, tour } = get();
      await run(() => container.editTourUseCase.unpublish(scope!, tour!.id), "Could not unpublish the tour", "Tour unpublished");
    },
  };
});
