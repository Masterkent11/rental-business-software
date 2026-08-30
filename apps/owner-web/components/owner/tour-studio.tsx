"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Info,
  Navigation,
  PanelRightClose,
  Rotate3d,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button, Chip } from "@heroui/react";

import { cn } from "@/lib/utils";
import type { Hotspot, Scene, Tour, TourSummary } from "@/lib/tour-fixtures";
import { useTourStudioStore } from "@/stores/use-tour-studio-store";

export function TourStudio({
  tour: initial,
  allTours,
  selectedTourId: propSelectedTourId,
  onSelectTour,
}: {
  tour: Tour;
  allTours?: TourSummary[];
  selectedTourId?: string;
  onSelectTour?: (id: string) => void;
}) {
  const {
    selectedTourId,
    scenes,
    activeId,
    selectedHotspot,
    placing,
    published,
    isTransitioning,
    panX,
    zoomLevel,
    isDragging,
    dragStartX,
    isReelOpen,
    isInspectorOpen,
    activeNoteModal,
    isUnitDropdownOpen,
    setSelectedHotspot,
    setPlacing,
    setPublished,
    setPanX,
    setZoomLevel,
    setIsDragging,
    setDragStartX,
    setIsReelOpen,
    setIsInspectorOpen,
    setActiveNoteModal,
    setIsUnitDropdownOpen,
    updateScene,
    addScenes,
    warpToRoom,
  } = useTourStudioStore();

  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = scenes.find((s) => s.id === activeId) ?? scenes[0]!;

  // Validation blockers for tour publish gate
  const blockers = ((): string[] => {
    const list: string[] = [];
    const ready = new Set(
      scenes.filter((s) => s.processingState === "READY").map((s) => s.id),
    );

    const stillProcessing = scenes.filter(
      (s) => s.processingState === "PROCESSING" || s.processingState === "UPLOADING",
    );
    if (stillProcessing.length > 0) {
      list.push(
        `${stillProcessing.length} scene${stillProcessing.length === 1 ? " is" : "s are"} still tiling`,
      );
    }

    for (const scene of scenes) {
      for (const h of scene.hotspots) {
        if (h.kind !== "NAVIGATION") continue;
        if (!h.targetSceneId) {
          list.push(`Portal in "${scene.label}" is not linked to any destination`);
        } else if (!ready.has(h.targetSceneId)) {
          const target = scenes.find((s) => s.id === h.targetSceneId);
          list.push(
            `"${scene.label}" links to "${target?.label ?? "unknown"}", which is still tiling`,
          );
        }
      }
      if (!scene.label.trim()) {
        list.push("Every scene needs a room label");
      }
    }

    return list;
  })();

  const handleStageClick = (e: React.MouseEvent) => {
    if (!placing || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const hotspot: Hotspot = {
      id: `h-${Date.now()}`,
      kind: placing,
      x: Math.min(0.92, Math.max(0.08, x)),
      y: Math.min(0.88, Math.max(0.12, y)),
      targetSceneId: null,
      note: placing === "INFO" ? "Custom feature highlight note" : undefined,
    };

    updateScene(active.id, (s) => ({ ...s, hotspots: [...s.hotspots, hotspot] }));
    setSelectedHotspot(hotspot.id);
    setIsInspectorOpen(true);
    setPlacing(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (placing) return;
    setIsDragging(true);
    setDragStartX(e.clientX - panX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newPan = e.clientX - dragStartX;
    setPanX(Math.max(-280, Math.min(280, newPan)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleHotspotClick = (h: Hotspot, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedHotspot(h.id);

    if (h.kind === "NAVIGATION" && h.targetSceneId) {
      warpToRoom(h.targetSceneId);
    } else if (h.kind === "INFO" && h.note) {
      setActiveNoteModal({
        title: `${active.label} Highlight`,
        note: h.note,
      });
    } else {
      setIsInspectorOpen(true);
    }
  };

  const handleUploadPanoramas = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newScenes: Scene[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const url = URL.createObjectURL(file);
      newScenes.push({
        id: `sc-${Date.now()}-${i}`,
        label: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") || `Room ${scenes.length + 1 + i}`,
        imageUrl: url,
        processingState: "READY",
        progress: 100,
        hotspots: [],
      });
    }
    addScenes(newScenes);
  };

  const selected = active.hotspots.find((h) => h.id === selectedHotspot) ?? null;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full bg-black text-white select-none overflow-hidden font-sans"
    >
      {/* ---------------------------------------------------- Matterport 3D Full-Bleed Canvas */}
      <div
        ref={stageRef}
        onClick={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={cn(
          "relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing",
          placing && "cursor-crosshair",
          isTransitioning && "transition-all duration-300 scale-105 blur-sm opacity-40",
        )}
      >
        {/* Continuous 360 Panorama Viewport */}
        <div
          className="relative h-full w-[140%] -left-[20%] transition-transform duration-100 ease-out will-change-transform"
          style={{
            transform: `translateX(${panX}px) scale(${zoomLevel})`,
          }}
        >
          <Image
            src={active.imageUrl}
            alt={active.label}
            fill
            unoptimized
            priority
            sizes="1920px"
            className="object-cover pointer-events-none"
          />
        </div>

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 pointer-events-none" />

        {/* ---------------------------------------------------- Matterport Navigation Rings & Tags */}
        {active.hotspots.map((h) => {
          const isDangling = h.kind === "NAVIGATION" && !h.targetSceneId;
          const target = scenes.find((s) => s.id === h.targetSceneId);
          const isSelected = h.id === selectedHotspot;

          return (
            <div
              key={h.id}
              onClick={(e) => handleHotspotClick(h, e)}
              style={{
                left: `calc(${h.x * 100}% + ${panX * 0.75}px)`,
                top: `${h.y * 100}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-30"
            >
              {h.kind === "NAVIGATION" ? (
                /* Matterport Floor Navigation Puck / Ring */
                <div className="flex flex-col items-center group-hover:scale-110 transition-transform duration-200">
                  <div className="relative grid place-items-center">
                    {/* Pulsing Radar Ring */}
                    <span className="absolute size-12 rounded-full bg-white/20 animate-ping duration-1000 pointer-events-none" />
                    
                    {/* Outer Glowing Disc */}
                    <div
                      className={cn(
                        "size-11 rounded-full grid place-items-center shadow-[0_0_24px_rgba(255,255,255,0.4)] backdrop-blur-md border-2 transition-all",
                        isDangling
                          ? "bg-rose-600/90 border-rose-300"
                          : isSelected
                            ? "bg-accent border-white ring-4 ring-accent/40 scale-110"
                            : "bg-black/60 border-white/90 group-hover:bg-accent group-hover:border-white",
                      )}
                    >
                      <Navigation className="size-5 text-white transition-transform group-hover:-translate-y-0.5" />
                    </div>
                  </div>

                  {/* Room Label Badge */}
                  <div
                    className={cn(
                      "mt-2 rounded-full px-3 py-1 text-[11.5px] font-bold tracking-wide text-white shadow-xl backdrop-blur-md border border-white/20 whitespace-nowrap transition-all",
                      isDangling
                        ? "bg-rose-900/80 text-rose-200"
                        : "bg-black/75 group-hover:bg-accent group-hover:border-white",
                    )}
                  >
                    {target ? `Walk to ${target.label}` : "Unlinked Portal"}
                  </div>
                </div>
              ) : (
                /* Matterport Tag Pin (Mattertag) */
                <div className="flex flex-col items-center group-hover:scale-110 transition-transform duration-200">
                  <div className="relative grid place-items-center">
                    <span className="absolute size-8 rounded-full bg-accent/40 animate-ping duration-1000" />
                    <div
                      className={cn(
                        "size-9 rounded-full grid place-items-center shadow-[0_0_20px_rgba(0,111,238,0.6)] backdrop-blur-md border-2 border-white transition-all",
                        isSelected ? "bg-white text-accent scale-110" : "bg-accent text-white",
                      )}
                    >
                      <Info className="size-4.5" />
                    </div>
                  </div>

                  <div className="mt-1.5 rounded-full bg-black/80 px-2.5 py-0.5 text-[11px] font-semibold text-white/90 border border-white/20 backdrop-blur-md whitespace-nowrap">
                    {h.note ? (h.note.length > 24 ? `${h.note.slice(0, 24)}…` : h.note) : "Tag"}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---------------------------------------------------- Matterport Top Floating Header Bar */}
      <div className="absolute top-4 inset-x-5 flex items-center justify-between pointer-events-none z-40">
        {/* Left: Property & Unit Breadcrumb */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
              className="flex items-center gap-2.5 rounded-2xl bg-black/70 hover:bg-black/90 px-4 py-2.5 text-white backdrop-blur-xl border border-white/15 shadow-2xl transition-all"
            >
              <Rotate3d className="size-4.5 text-accent" />
              <div className="text-left min-w-0">
                <p className="text-[13.5px] font-extrabold tracking-tight truncate leading-tight">
                  {initial.resourceLabel} · {initial.propertyName}
                </p>
                <p className="text-[11px] text-white/60 font-medium truncate">
                  {active.label} ({active.hotspots.length} hotspots)
                </p>
              </div>
              <ChevronDown className="size-4 text-white/60 ml-1" />
            </button>

            {/* Dropdown for other units */}
            {isUnitDropdownOpen && allTours ? (
              <div className="absolute top-full mt-2 left-0 w-64 rounded-2xl bg-zinc-900/95 border border-white/15 shadow-2xl backdrop-blur-2xl p-1.5 space-y-1 z-50">
                <p className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-white/50">
                  Switch Unit 360° Tour:
                </p>
                {allTours.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelectTour?.(t.id);
                      setIsUnitDropdownOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-bold text-left transition-colors",
                      t.id === (propSelectedTourId ?? selectedTourId)
                        ? "bg-accent text-white"
                        : "text-white/80 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <span>{t.resourceLabel}</span>
                    <span className="text-[11px] font-normal opacity-70">{t.scenes} scenes</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <Chip
            size="sm"
            color={published ? "success" : "warning"}
            variant="soft"
            className="font-bold text-[11px] h-7 px-3 bg-black/60 backdrop-blur-md border border-white/15"
          >
            {published ? "● Live in Customer App" : "Draft Tour"}
          </Chip>
        </div>

        {/* Right: Matterport Authoring Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Add Portal Button */}
          <button
            type="button"
            onClick={() => setPlacing(placing === "NAVIGATION" ? null : "NAVIGATION")}
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[12.5px] font-bold backdrop-blur-xl border shadow-xl transition-all",
              placing === "NAVIGATION"
                ? "bg-accent text-white border-white ring-2 ring-accent/50 scale-105"
                : "bg-black/70 hover:bg-black/90 text-white border-white/15 hover:border-white/30",
            )}
          >
            <Navigation className="size-4" />
            <span>{placing === "NAVIGATION" ? "Click to drop portal…" : "Add Portal"}</span>
          </button>

          {/* Add Tag Button */}
          <button
            type="button"
            onClick={() => setPlacing(placing === "INFO" ? null : "INFO")}
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[12.5px] font-bold backdrop-blur-xl border shadow-xl transition-all",
              placing === "INFO"
                ? "bg-accent text-white border-white ring-2 ring-accent/50 scale-105"
                : "bg-black/70 hover:bg-black/90 text-white border-white/15 hover:border-white/30",
            )}
          >
            <Tag className="size-4" />
            <span>{placing === "INFO" ? "Click to drop tag…" : "Add Tag"}</span>
          </button>

          {/* Publish Button */}
          <button
            type="button"
            onClick={() => setPublished(!published)}
            disabled={blockers.length > 0}
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[12.5px] font-bold backdrop-blur-xl border shadow-xl transition-all",
              blockers.length > 0
                ? "bg-zinc-800/80 text-white/50 border-white/10 cursor-not-allowed"
                : published
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-400"
                  : "bg-accent hover:bg-accent/90 text-white border-accent-soft",
            )}
          >
            <Check className="size-4" />
            <span>{published ? "Published" : "Publish 3D Tour"}</span>
          </button>

          {/* Toggle Inspector Drawer */}
          <button
            type="button"
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className="grid size-10 place-items-center rounded-2xl bg-black/70 hover:bg-black/90 text-white border border-white/15 backdrop-blur-xl shadow-xl transition-all"
            title="Toggle Studio Inspector"
          >
            {isInspectorOpen ? (
              <PanelRightClose className="size-5 text-accent" />
            ) : (
              <SlidersHorizontal className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- Floating Zoom & Compass Widget */}
      <div className="absolute top-20 right-5 flex flex-col items-center gap-2 z-30 pointer-events-auto">
        <div className="flex flex-col rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 shadow-2xl p-1 overflow-hidden">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(1.45, z + 0.1))}
            className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="size-4.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(1.0, z - 0.1))}
            className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors border-t border-white/10"
            title="Zoom Out"
          >
            <ZoomOut className="size-4.5" />
          </button>
        </div>

        <div className="size-10 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 shadow-2xl grid place-items-center text-accent">
          <Compass className="size-5 animate-pulse" />
        </div>
      </div>

      {/* ---------------------------------------------------- Mattertag Info Modal Popover */}
      {activeNoteModal ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-zinc-900/95 border border-white/20 p-6 shadow-2xl backdrop-blur-2xl text-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent font-bold text-[13px] uppercase tracking-wider">
                <Sparkles className="size-4" />
                <span>{activeNoteModal.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveNoteModal(null)}
                className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="text-[14.5px] font-medium leading-relaxed text-white/90">
              {activeNoteModal.note}
            </p>
            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                variant="primary"
                className="rounded-xl font-bold px-5"
                onClick={() => setActiveNoteModal(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------------------------------------------------- Matterport Highlights Filmstrip Reel (Bottom) */}
      <div className="absolute bottom-4 inset-x-5 flex flex-col items-center gap-2 pointer-events-none z-40">
        {/* Toggle Reel Button */}
        <button
          type="button"
          onClick={() => setIsReelOpen(!isReelOpen)}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/80 hover:bg-black/95 px-4 py-1.5 text-[11.5px] font-bold text-white/90 backdrop-blur-xl border border-white/15 shadow-2xl transition-all"
        >
          <span>{isReelOpen ? "Hide Highlights Reel" : `Show ${scenes.length} Rooms`}</span>
          {isReelOpen ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
        </button>

        {/* Reel Filmstrip Cards */}
        {isReelOpen ? (
          <div className="pointer-events-auto flex items-center gap-3 overflow-x-auto max-w-full p-3 rounded-3xl bg-black/75 backdrop-blur-2xl border border-white/15 shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
            {scenes.map((scene) => {
              const isActive = scene.id === active.id;
              const isStart = scene.id === initial.entrySceneId;

              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => warpToRoom(scene.id)}
                  className={cn(
                    "group relative w-36 h-22 rounded-2xl overflow-hidden shrink-0 border text-left transition-all duration-200",
                    isActive
                      ? "border-accent ring-2 ring-accent/50 scale-105 shadow-[0_0_20px_rgba(0,111,238,0.5)]"
                      : "border-white/15 hover:border-white/40 opacity-70 hover:opacity-100",
                  )}
                >
                  <Image
                    src={scene.imageUrl}
                    alt={scene.label}
                    fill
                    unoptimized
                    sizes="160px"
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {isStart ? (
                    <span className="absolute top-1.5 left-1.5 rounded-md bg-accent px-1.5 py-0.5 text-[8.5px] font-extrabold text-white shadow-xs">
                      START
                    </span>
                  ) : null}

                  <span className="absolute top-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[8.5px] font-bold text-white/80">
                    {scene.hotspots.length} pts
                  </span>

                  <div className="absolute bottom-1.5 inset-x-2">
                    <p className="text-[11.5px] font-extrabold text-white truncate leading-tight">
                      {scene.label}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Add Scene Upload Card */}
            <label className="flex flex-col items-center justify-center w-28 h-22 rounded-2xl border-2 border-dashed border-white/25 hover:border-accent bg-white/5 hover:bg-white/10 shrink-0 cursor-pointer transition-all">
              <UploadCloud className="size-5 text-accent mb-0.5" />
              <span className="text-[10.5px] font-bold text-white">Add Scene</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadPanoramas(e.target.files)}
              />
            </label>
          </div>
        ) : null}
      </div>

      {/* ---------------------------------------------------- Matterport Workshop Side Inspector Drawer */}
      {isInspectorOpen ? (
        <div className="absolute top-0 right-0 bottom-0 w-84 bg-zinc-900/95 border-l border-white/15 shadow-2xl backdrop-blur-2xl p-5 overflow-y-auto space-y-5 z-50 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-accent" />
              <h3 className="text-[14.5px] font-bold tracking-tight text-white">
                Room & Hotspot Workshop
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsInspectorOpen(false)}
              className="rounded-full p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="size-4.5" />
            </button>
          </div>

          {/* Active Room Label Editor */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">
              Active Room Name
            </label>
            <input
              type="text"
              value={active.label}
              onChange={(e) =>
                updateScene(active.id, (s) => ({ ...s, label: e.target.value }))
              }
              className="w-full h-9 px-3 rounded-xl bg-black/60 border border-white/15 text-[13px] font-semibold text-white focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. Living Room, Balcony..."
            />
          </div>

          {/* Selected Hotspot Settings */}
          {selected ? (
            <div className="space-y-4 rounded-2xl bg-black/50 border border-white/15 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-extrabold text-accent uppercase tracking-wider">
                  {selected.kind === "NAVIGATION" ? "Portal Hotspot" : "Mattertag Note"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    updateScene(active.id, (sc) => ({
                      ...sc,
                      hotspots: sc.hotspots.filter((h) => h.id !== selected.id),
                    }));
                    setSelectedHotspot(null);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>

              {selected.kind === "NAVIGATION" ? (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/70 block">
                    Link Portal to Room:
                  </label>
                  <div className="space-y-1.5">
                    {scenes
                      .filter((s) => s.id !== active.id)
                      .map((s) => {
                        const isTarget = selected.targetSceneId === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() =>
                              updateScene(active.id, (sc) => ({
                                ...sc,
                                hotspots: sc.hotspots.map((h) =>
                                  h.id === selected.id ? { ...h, targetSceneId: s.id } : h,
                                ),
                              }))
                            }
                            className={cn(
                              "flex w-full items-center justify-between p-2.5 rounded-xl border text-left text-[12px] font-bold transition-all",
                              isTarget
                                ? "bg-accent text-white border-white shadow-xs"
                                : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10",
                            )}
                          >
                            <span className="truncate">{s.label}</span>
                            {isTarget ? <Check className="size-3.5" /> : <ArrowRight className="size-3 opacity-40" />}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/70 block">
                    Feature Note Description:
                  </label>
                  <textarea
                    rows={3}
                    value={selected.note ?? ""}
                    onChange={(e) =>
                      updateScene(active.id, (sc) => ({
                        ...sc,
                        hotspots: sc.hotspots.map((h) =>
                          h.id === selected.id ? { ...h, note: e.target.value } : h,
                        ),
                      }))
                    }
                    placeholder="Describe furniture, inclusions, or view..."
                    className="w-full p-2.5 rounded-xl bg-black/60 border border-white/15 text-[12.5px] text-white focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-black/40 border border-white/10 p-3.5 text-center text-white/50 text-[12px]">
              Click any ring or pin on the 360° stage to edit its target or note.
            </div>
          )}

          {/* Validation Status Checklist */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">
              Matterport Integrity Check:
            </span>
            {blockers.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-[12.5px]">
                <Check className="size-4" />
                <span>All portals connected & ready</span>
              </div>
            ) : (
              <ul className="space-y-1 text-[11.5px] text-amber-400">
                {blockers.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
