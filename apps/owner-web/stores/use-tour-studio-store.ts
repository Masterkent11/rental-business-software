/**
 * Presentation Store: useTourStudioStore
 *
 * Replaces component-level useState in 360 Virtual Tour Studio with Zustand.
 */

import { create } from "zustand";
import type { Hotspot, Scene, Tour } from "../lib/tour-fixtures";
import { tour as defaultTour } from "../lib/tour-fixtures";

interface TourStudioState {
  selectedTourId: string;
  scenes: Scene[];
  activeId: string;
  selectedHotspot: string | null;
  placing: "NAVIGATION" | "INFO" | null;
  published: boolean;
  isTransitioning: boolean;
  panX: number;
  zoomLevel: number;
  isDragging: boolean;
  dragStartX: number;
  isReelOpen: boolean;
  isInspectorOpen: boolean;
  activeNoteModal: { title: string; note: string } | null;
  isUnitDropdownOpen: boolean;

  // Actions
  initializeTour: (tour: Tour) => void;
  setSelectedTourId: (id: string) => void;
  setActiveId: (id: string) => void;
  setSelectedHotspot: (id: string | null) => void;
  setPlacing: (placing: "NAVIGATION" | "INFO" | null) => void;
  setPublished: (published: boolean) => void;
  setIsTransitioning: (transitioning: boolean) => void;
  setPanX: (panX: number | ((prev: number) => number)) => void;
  setZoomLevel: (zoom: number | ((prev: number) => number)) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragStartX: (x: number) => void;
  setIsReelOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsInspectorOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setActiveNoteModal: (modal: { title: string; note: string } | null) => void;
  setIsUnitDropdownOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  updateScene: (id: string, fn: (s: Scene) => Scene) => void;
  addScenes: (newScenes: Scene[]) => void;
  warpToRoom: (targetSceneId: string) => void;
  addHotspot: (sceneId: string, hotspot: Hotspot) => void;
  removeHotspot: (sceneId: string, hotspotId: string) => void;
}

export const useTourStudioStore = create<TourStudioState>((set, get) => ({
  selectedTourId: defaultTour.id,
  scenes: defaultTour.scenes,
  activeId: defaultTour.entrySceneId ?? defaultTour.scenes[0]?.id ?? "",
  selectedHotspot: null,
  placing: null,
  published: defaultTour.state === "PUBLISHED",
  isTransitioning: false,
  panX: 0,
  zoomLevel: 1.08,
  isDragging: false,
  dragStartX: 0,
  isReelOpen: true,
  isInspectorOpen: false,
  activeNoteModal: null,
  isUnitDropdownOpen: false,

  initializeTour: (tour: Tour) => {
    set({
      selectedTourId: tour.id,
      scenes: tour.scenes,
      activeId: tour.entrySceneId ?? tour.scenes[0]?.id ?? "",
      selectedHotspot: null,
      placing: null,
      published: tour.state === "PUBLISHED",
      isTransitioning: false,
      panX: 0,
      zoomLevel: 1.08,
      isDragging: false,
      dragStartX: 0,
    });
  },

  setSelectedTourId: (selectedTourId) => set({ selectedTourId }),
  setActiveId: (activeId) => set({ activeId }),
  setSelectedHotspot: (selectedHotspot) => set({ selectedHotspot }),
  setPlacing: (placing) => set({ placing }),
  setPublished: (published) => set({ published }),
  setIsTransitioning: (isTransitioning) => set({ isTransitioning }),
  setPanX: (panX) =>
    set((state) => ({ panX: typeof panX === "function" ? panX(state.panX) : panX })),
  setZoomLevel: (zoomLevel) =>
    set((state) => ({
      zoomLevel: typeof zoomLevel === "function" ? zoomLevel(state.zoomLevel) : zoomLevel,
    })),
  setIsDragging: (isDragging) => set({ isDragging }),
  setDragStartX: (dragStartX) => set({ dragStartX }),
  setIsReelOpen: (isReelOpen) =>
    set((state) => ({
      isReelOpen: typeof isReelOpen === "function" ? isReelOpen(state.isReelOpen) : isReelOpen,
    })),
  setIsInspectorOpen: (isInspectorOpen) =>
    set((state) => ({
      isInspectorOpen:
        typeof isInspectorOpen === "function"
          ? isInspectorOpen(state.isInspectorOpen)
          : isInspectorOpen,
    })),
  setActiveNoteModal: (activeNoteModal) => set({ activeNoteModal }),
  setIsUnitDropdownOpen: (isUnitDropdownOpen) =>
    set((state) => ({
      isUnitDropdownOpen:
        typeof isUnitDropdownOpen === "function"
          ? isUnitDropdownOpen(state.isUnitDropdownOpen)
          : isUnitDropdownOpen,
    })),

  updateScene: (id: string, fn: (s: Scene) => Scene) => {
    set((state) => ({
      scenes: state.scenes.map((s) => (s.id === id ? fn(s) : s)),
      published: false,
    }));
  },

  addScenes: (newScenes: Scene[]) => {
    set((state) => ({
      scenes: [...state.scenes, ...newScenes],
      published: false,
    }));
  },

  warpToRoom: (targetSceneId: string) => {
    const { activeId } = get();
    if (targetSceneId === activeId) return;
    set({ isTransitioning: true });
    setTimeout(() => {
      set({
        activeId: targetSceneId,
        selectedHotspot: null,
        panX: 0,
        isTransitioning: false,
      });
    }, 280);
  },

  addHotspot: (sceneId: string, hotspot: Hotspot) => {
    get().updateScene(sceneId, (s) => ({
      ...s,
      hotspots: [...s.hotspots, hotspot],
    }));
    set({ placing: null, selectedHotspot: hotspot.id, isInspectorOpen: true });
  },

  removeHotspot: (sceneId: string, hotspotId: string) => {
    get().updateScene(sceneId, (s) => ({
      ...s,
      hotspots: s.hotspots.filter((h) => h.id !== hotspotId),
    }));
    set({ selectedHotspot: null });
  },
}));
