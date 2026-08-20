"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Check,
  Info,
  MousePointerClick,
  Navigation,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/owner/shell";
import { Pill } from "@/components/owner/status";
import { cn } from "@/lib/utils";
import type { Hotspot, Scene, Tour } from "@/lib/tour-fixtures";

/**
 * Tour authoring.
 *
 * Authoring — not capture, not playback — is the V1 risk named in Step 1: if
 * placing hotspots is too hard, listings ship without tours and the
 * differentiator evaporates. So the whole screen is built around making the
 * two hard questions obvious: *where does this hotspot go* and *why can I not
 * publish yet*.
 *
 * Click the panorama to drop a hotspot. Drag it to move. Pick where it leads.
 * The publish button never sits greyed out with no explanation — it names every
 * blocker, because [I-07] refusing a broken tour is only useful if the owner
 * can tell what to fix.
 */
export function TourStudio({ tour: initial }: { tour: Tour }) {
  const [scenes, setScenes] = useState<Scene[]>(initial.scenes);
  const [activeId, setActiveId] = useState(initial.entrySceneId ?? scenes[0].id);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [placing, setPlacing] = useState<"NAVIGATION" | "INFO" | null>(null);
  const [published, setPublished] = useState(initial.state === "PUBLISHED");
  const stageRef = useRef<HTMLDivElement>(null);

  const active = scenes.find((s) => s.id === activeId) ?? scenes[0];

  // [I-07] made visible: every reason this tour cannot go public.
  //
  // Computed inline rather than in a useMemo — the React Compiler memoizes this
  // automatically, and a hand-written useMemo it cannot verify is a lint error
  // rather than an optimisation.
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
        `${stillProcessing.length} scene${stillProcessing.length === 1 ? " is" : "s are"} still processing — ${stillProcessing
          .map((s) => s.label)
          .join(", ")}`,
      );
    }

    for (const scene of scenes) {
      for (const h of scene.hotspots) {
        if (h.kind !== "NAVIGATION") continue;
        if (!h.targetSceneId) {
          list.push(`A hotspot in ${scene.label} does not lead anywhere yet`);
        } else if (!ready.has(h.targetSceneId)) {
          const target = scenes.find((s) => s.id === h.targetSceneId);
          list.push(
            `${scene.label} links to ${target?.label ?? "a missing scene"}, which is not ready`,
          );
        }
      }
      if (!scene.label.trim()) {
        list.push("Every scene needs a name before it can be published");
      }
    }

    const unreachable = scenes.filter(
      (s) =>
        s.id !== initial.entrySceneId &&
        !scenes.some((other) =>
          other.hotspots.some((h) => h.targetSceneId === s.id),
        ),
    );
    for (const s of unreachable) {
      list.push(`${s.label} cannot be reached from any other scene`);
    }

    return list;
  })();

  function updateScene(id: string, fn: (s: Scene) => Scene) {
    setScenes((prev) => prev.map((s) => (s.id === id ? fn(s) : s)));
    setPublished(false);
  }

  function handleStageClick(e: React.MouseEvent) {
    if (!placing || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const hotspot: Hotspot = {
      id: `h-${Date.now()}`,
      kind: placing,
      x: Math.min(0.94, Math.max(0.06, x)),
      y: Math.min(0.9, Math.max(0.08, y)),
      targetSceneId: null,
      note: placing === "INFO" ? "" : undefined,
    };

    updateScene(active.id, (s) => ({ ...s, hotspots: [...s.hotspots, hotspot] }));
    setSelectedHotspot(hotspot.id);
    setPlacing(null);
  }

  const selected = active.hotspots.find((h) => h.id === selectedHotspot) ?? null;

  return (
    <div className="grid gap-5 xl:grid-cols-[210px_minmax(0,1fr)_290px]">
      {/* ------------------------------------------------------ scene rail */}
      <div>
        <p className="label-caps text-muted-foreground mb-2.5">
          Scenes · {scenes.length}
        </p>
        <div className="space-y-2">
          {scenes.map((scene) => {
            const busy = scene.processingState !== "READY";
            return (
              <button
                key={scene.id}
                onClick={() => {
                  setActiveId(scene.id);
                  setSelectedHotspot(null);
                }}
                className={cn(
                  "relative block w-full overflow-hidden rounded-[13px] border text-left transition-all",
                  scene.id === activeId
                    ? "border-foreground ring-foreground/15 ring-2"
                    : "border-border hover:border-foreground/30",
                )}
              >
                <div className="bg-secondary relative h-[68px]">
                  <Image
                    src={scene.imageUrl}
                    alt={scene.label}
                    fill
                    unoptimized
                    sizes="210px"
                    className={cn("object-cover", busy && "opacity-40")}
                  />
                  {busy ? (
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="w-3/4">
                        <div className="h-1 overflow-hidden rounded-full bg-black/20">
                          <div
                            className="h-full rounded-full bg-white"
                            style={{ width: `${scene.progress ?? 15}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-center text-[10.5px] font-medium text-white drop-shadow">
                          Tiling {scene.progress ?? 15}%
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {scene.id === initial.entrySceneId ? (
                    <span className="glass absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold">
                      START
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                  <span className="truncate text-[12.5px] font-medium">
                    {scene.label}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[11px]">
                    {scene.hotspots.length}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <label className="border-border hover:border-foreground/40 mt-3 flex cursor-pointer flex-col items-center gap-1.5 rounded-[13px] border border-dashed px-3 py-5 text-center transition-colors">
          <Upload className="text-muted-foreground size-4" />
          <span className="text-[12.5px] font-medium">Upload panoramas</span>
          <span className="text-muted-foreground text-[11px] leading-snug">
            Drag several at once. Each is tiled before it can be published.
          </span>
          <input type="file" accept="image/*" multiple className="hidden" />
        </label>
      </div>

      {/* ---------------------------------------------------------- stage */}
      <div>
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={placing === "NAVIGATION" ? "default" : "outline"}
            className="rounded-full"
            onClick={() =>
              setPlacing(placing === "NAVIGATION" ? null : "NAVIGATION")
            }
          >
            <Navigation className="size-3.5" /> Add a way through
          </Button>
          <Button
            size="sm"
            variant={placing === "INFO" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setPlacing(placing === "INFO" ? null : "INFO")}
          >
            <Info className="size-3.5" /> Add a note
          </Button>
          {placing ? (
            <span className="text-money flex items-center gap-1.5 text-[12.5px] font-medium">
              <MousePointerClick className="size-3.5" />
              Click where it should sit
            </span>
          ) : null}
        </div>

        <div
          ref={stageRef}
          onClick={handleStageClick}
          className={cn(
            "border-border relative aspect-[16/9] overflow-hidden rounded-[18px] border",
            placing && "cursor-crosshair",
          )}
        >
          <Image
            src={active.imageUrl}
            alt={active.label}
            fill
            unoptimized
            sizes="800px"
            className="object-cover"
          />

          {active.processingState !== "READY" ? (
            <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-sm">
              <div className="text-center text-white">
                <p className="text-[15px] font-semibold">Still tiling</p>
                <p className="mt-1 text-[12.5px] text-white/70">
                  You can name it now. Hotspots open when it is ready.
                </p>
              </div>
            </div>
          ) : null}

          {active.hotspots.map((h) => {
            const dangling = h.kind === "NAVIGATION" && !h.targetSceneId;
            const target = scenes.find((s) => s.id === h.targetSceneId);
            return (
              <button
                key={h.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedHotspot(h.id);
                }}
                style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-full border-2 transition-transform",
                    h.id === selectedHotspot && "scale-110",
                    dangling
                      ? "border-white bg-[var(--color-bad)]"
                      : "glass border-white",
                  )}
                >
                  {h.kind === "NAVIGATION" ? (
                    dangling ? (
                      <AlertTriangle className="size-4 text-white" />
                    ) : (
                      <span className="size-2.5 rounded-full bg-white" />
                    )
                  ) : (
                    <Info className="size-3.5 text-white" />
                  )}
                </span>
                {h.kind === "NAVIGATION" ? (
                  <span className="glass mt-1 block rounded-full px-2 py-0.5 text-[10.5px] whitespace-nowrap">
                    {target ? target.label : "goes nowhere"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <input
            value={active.label}
            onChange={(e) =>
              updateScene(active.id, (s) => ({ ...s, label: e.target.value }))
            }
            placeholder="Name this room"
            className="border-border focus:border-foreground/40 w-full max-w-xs rounded-[11px] border bg-transparent px-3 py-2 text-[13.5px] outline-none"
          />
          <span className="text-muted-foreground text-[12px]">
            Customers always see this label while they walk
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------- inspector */}
      <div className="space-y-4">
        <Panel className="p-4">
          <p className="label-caps text-muted-foreground mb-2.5">
            {selected ? "Hotspot" : "Nothing selected"}
          </p>

          {!selected ? (
            <p className="text-muted-foreground text-[12.5px] leading-relaxed">
              Click a hotspot on the panorama to edit it, or add one with the
              buttons above.
            </p>
          ) : selected.kind === "NAVIGATION" ? (
            <>
              <p className="mb-2 text-[12.5px] font-medium">Walks through to</p>
              <div className="space-y-1">
                {scenes
                  .filter((s) => s.id !== active.id)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() =>
                        updateScene(active.id, (sc) => ({
                          ...sc,
                          hotspots: sc.hotspots.map((h) =>
                            h.id === selected.id
                              ? { ...h, targetSceneId: s.id }
                              : h,
                          ),
                        }))
                      }
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-[10px] border px-2.5 py-2 text-left text-[12.5px] transition-colors",
                        selected.targetSceneId === s.id
                          ? "border-foreground bg-secondary font-medium"
                          : "border-border hover:bg-secondary/60",
                      )}
                    >
                      {s.label}
                      {s.processingState !== "READY" ? (
                        <Pill variant="pending">tiling</Pill>
                      ) : selected.targetSceneId === s.id ? (
                        <Check className="size-3.5" />
                      ) : null}
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <>
              <p className="mb-2 text-[12.5px] font-medium">Note</p>
              <textarea
                value={selected.note ?? ""}
                onChange={(e) =>
                  updateScene(active.id, (sc) => ({
                    ...sc,
                    hotspots: sc.hotspots.map((h) =>
                      h.id === selected.id ? { ...h, note: e.target.value } : h,
                    ),
                  }))
                }
                rows={3}
                placeholder="Inverter aircon — included in rent"
                className="border-border focus:border-foreground/40 w-full rounded-[11px] border bg-transparent px-3 py-2 text-[13px] outline-none"
              />
            </>
          )}

          {selected ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-bad hover:text-bad mt-3 w-full rounded-full"
              onClick={() => {
                updateScene(active.id, (sc) => ({
                  ...sc,
                  hotspots: sc.hotspots.filter((h) => h.id !== selected.id),
                }));
                setSelectedHotspot(null);
              }}
            >
              <Trash2 className="size-3.5" /> Remove
            </Button>
          ) : null}
        </Panel>

        {/* Publish gate — never a silent disabled button. */}
        <Panel tone={blockers.length > 0 ? "pending" : "plain"} className="p-4">
          <p className="label-caps text-muted-foreground mb-2.5">Publish</p>

          {blockers.length === 0 ? (
            <>
              <p className="text-[12.5px] leading-relaxed">
                Every scene is ready and every way through leads somewhere.
                Publishing makes this visible in the customer app immediately —
                on both the monthly and the nightly listing.
              </p>
              <Button
                className="mt-3 w-full rounded-full"
                onClick={() => setPublished(true)}
                disabled={published}
              >
                {published ? (
                  <>
                    <Check className="size-3.5" /> Published
                  </>
                ) : (
                  "Publish tour"
                )}
              </Button>
            </>
          ) : (
            <>
              <p className="mb-2 text-[12.5px] font-medium">
                {blockers.length} thing{blockers.length === 1 ? "" : "s"} to fix
                first
              </p>
              <ul className="space-y-1.5">
                {blockers.map((b, i) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-snug">
                    <AlertTriangle className="text-pending mt-0.5 size-3 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-3 text-[11.5px] leading-relaxed">
                A walkthrough that dead-ends is worse than no walkthrough — the
                customer already trusted it.
              </p>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
