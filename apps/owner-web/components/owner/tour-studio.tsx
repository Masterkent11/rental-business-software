"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CircleDot,
  Crosshair,
  DoorOpen,
  Expand,
  Flag,
  Info,
  Loader2,
  Minimize,
  Move,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import { Page, SectionHeading, TopBar } from "@/components/owner/shell";
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, Field, InlineError, LinkBtn, SegmentedTabs, Select, Skeleton, TextInput } from "@/components/owner/ui";
import { Photo } from "@/components/owner/photo";
import { PanoramaViewer } from "@/components/owner/panorama-viewer";
import { cn } from "@/lib/utils";
import { TOUR_STATE_LABEL, screenFromDirection, type TourHotspot, type TourScene } from "@/domain/tours/tour";
import { useSessionStore } from "@/stores/use-session-store";
import { useTourStudioStore } from "@/stores/use-tour-studio-store";

function HotspotMarker({ hotspot, scenes, selected }: { hotspot: TourHotspot; scenes: readonly TourScene[]; selected: boolean }) {
  const { camera, viewport, selectHotspot } = useTourStudioStore();
  const point = screenFromDirection({ yaw: hotspot.yaw, pitch: hotspot.pitch, viewYaw: camera.yaw, viewPitch: camera.pitch, fov: camera.fov, width: viewport.width, height: viewport.height });
  if (!point) return null;
  const target = scenes.find((s) => s.id === hotspot.targetSceneId);
  const label = hotspot.kind === "NAVIGATION" ? (target ? `Go to ${target.label}` : "Door") : hotspot.label;
  return (
    <button
      type="button"
      data-hotspot
      onClick={() => selectHotspot(hotspot.id)}
      style={{ left: point.x, top: point.y }}
      className={cn(
        "focusable absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold shadow-lg backdrop-blur",
        selected ? "bg-white text-foreground ring-2 ring-white" : "bg-black/55 text-white hover:bg-black/70",
      )}
    >
      {hotspot.kind === "NAVIGATION" ? <DoorOpen className="size-3.5" aria-hidden /> : <Info className="size-3.5" aria-hidden />}
      <span className="max-w-[160px] truncate">{label}</span>
    </button>
  );
}

function DraftMarker() {
  const { draft, camera, viewport } = useTourStudioStore();
  if (!draft) return null;
  const point = screenFromDirection({ yaw: draft.yaw, pitch: draft.pitch, viewYaw: camera.yaw, viewPitch: camera.pitch, fov: camera.fov, width: viewport.width, height: viewport.height });
  if (!point) return null;
  return (
    <span style={{ left: point.x, top: point.y }} className="pointer-events-none absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-foreground shadow-lg ring-4 ring-white/40">
      <CircleDot className="size-4" aria-hidden />
    </span>
  );
}

function Viewer({ scene, scenes, editable }: { scene: TourScene; scenes: readonly TourScene[]; editable: boolean }) {
  const { camera, mode, selectedHotspotId, imageState, fullscreen, busy, setCamera, setViewport, setImageState, placeAt, setMode, setFullscreen, saveInitialView } = useTourStudioStore();
  const imageUrl = scene.state === "READY" ? (scene.previewUrl ?? scene.sourceUrl) : null;
  const picking = mode === "place" || mode === "move";

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border border-border bg-black", fullscreen && "fixed inset-0 z-50 rounded-none border-0")}>
      <PanoramaViewer
        imageUrl={imageUrl}
        camera={camera}
        onCamera={setCamera}
        onViewport={setViewport}
        onImageState={setImageState}
        onPick={editable && picking ? (direction) => void placeAt(direction.yaw, direction.pitch) : undefined}
        picking={editable && picking}
        className={fullscreen ? "flex-1" : "aspect-[16/9] w-full"}
      >
        {imageState === "ready" && imageUrl
          ? scene.hotspots.map((hotspot) => <HotspotMarker key={hotspot.id} hotspot={hotspot} scenes={scenes} selected={hotspot.id === selectedHotspotId} />)
          : null}
        <DraftMarker />
        {scene.state === "PROCESSING" || scene.state === "UPLOADING" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
            <Loader2 className="size-6 animate-spin" aria-hidden />
            <p className="text-[13px]">Preparing this room. It usually takes under a minute.</p>
          </div>
        ) : scene.state === "FAILED" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white">
            <p className="text-[14px] font-semibold">This room could not be processed</p>
            <p className="text-[12.5px] text-white/70">{scene.failureReason ?? "Delete it and upload the 360° photo again."}</p>
          </div>
        ) : imageState === "loading" ? (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Loader2 className="size-6 animate-spin" aria-label="Loading 360° view" />
          </div>
        ) : imageState === "failed" ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[13px] text-white">
            The 360° view could not be displayed. Check your connection, or try a browser with WebGL enabled.
          </div>
        ) : null}
        {picking && editable ? (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-[12px] font-medium text-white">
            {mode === "place" ? "Click where the hotspot should appear" : "Click the new position for this hotspot"}
          </div>
        ) : null}
      </PanoramaViewer>
      <div className="flex flex-wrap items-center gap-2 bg-surface px-3 py-2.5">
        {editable ? (
          <>
            <Btn size="sm" variant={mode === "look" ? "primary" : "ghost"} onClick={() => setMode("look")}>
              <Move className="size-3.5" aria-hidden /> Look around
            </Btn>
            <Btn size="sm" variant={mode === "place" ? "primary" : "ghost"} onClick={() => setMode("place")} disabled={scene.state !== "READY"}>
              <Plus className="size-3.5" aria-hidden /> Add hotspot
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => void saveInitialView()} busy={busy} disabled={scene.state !== "READY"}>
              <Crosshair className="size-3.5" aria-hidden /> Use this view as start
            </Btn>
          </>
        ) : null}
        <span className="ml-auto tabular text-[11.5px] text-muted">
          {Math.round(camera.yaw)}° · {Math.round(camera.pitch)}° · {Math.round(camera.fov)}° fov
        </span>
        <Btn size="sm" variant="ghost" onClick={() => setFullscreen(!fullscreen)} aria-label={fullscreen ? "Exit full screen" : "Full screen"}>
          {fullscreen ? <Minimize className="size-4" aria-hidden /> : <Expand className="size-4" aria-hidden />}
        </Btn>
      </div>
    </div>
  );
}

function RoomStrip({ scenes, entryId }: { scenes: readonly TourScene[]; entryId: string | null }) {
  const { sceneId, selectScene } = useTourStudioStore();
  return (
    <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Rooms">
      {scenes.map((scene) => (
        <li key={scene.id} className="shrink-0">
          <button
            type="button"
            onClick={() => selectScene(scene.id)}
            aria-current={scene.id === sceneId ? "true" : undefined}
            className={cn("focusable flex w-36 flex-col overflow-hidden rounded-xl border bg-surface text-left", scene.id === sceneId ? "border-foreground" : "border-border hover:border-foreground/25")}
          >
            <div className="relative aspect-[2/1] bg-surface-secondary">
              {scene.thumbnailUrl ? <Photo src={scene.thumbnailUrl} alt="" className="size-full" sizes="144px" /> : null}
              {scene.id === entryId ? (
                <span className="absolute left-1.5 top-1.5">
                  <Badge tone="dark">Start</Badge>
                </span>
              ) : null}
              {scene.state !== "READY" ? (
                <span className="absolute bottom-1.5 left-1.5">
                  <Badge tone={scene.state === "FAILED" ? "bad" : "pending"}>{scene.state === "FAILED" ? "Failed" : "Processing"}</Badge>
                </span>
              ) : null}
            </div>
            <span className="truncate px-2.5 py-1.5 text-[12.5px] font-medium">{scene.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function DraftForm({ scenes, sceneId }: { scenes: readonly TourScene[]; sceneId: string }) {
  const { draft, busy, setDraft, cancelDraft, saveDraft } = useTourStudioStore();
  if (!draft) return null;
  const targets = scenes.filter((s) => s.id !== sceneId);
  return (
    <Card className="p-4">
      <p className="mb-3 text-[13.5px] font-semibold">New hotspot</p>
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void saveDraft();
        }}
      >
        <SegmentedTabs<"NAVIGATION" | "INFO">
          label="Hotspot type"
          value={draft.kind}
          onChange={(kind) => setDraft({ kind, targetSceneId: kind === "NAVIGATION" ? (targets[0]?.id ?? null) : null })}
          options={[
            { value: "NAVIGATION", label: "Door to a room" },
            { value: "INFO", label: "Info note" },
          ]}
        />
        {draft.kind === "NAVIGATION" ? (
          targets.length === 0 ? (
            <p className="text-[12.5px] text-muted">Upload another room first, then link it with a door.</p>
          ) : (
            <Field label="Leads to" htmlFor="draftTarget">
              <Select id="draftTarget" value={draft.targetSceneId ?? ""} onChange={(e) => setDraft({ targetSceneId: e.target.value || null })}>
                {targets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          )
        ) : null}
        <Field label={draft.kind === "INFO" ? "Note" : "Label (optional)"} htmlFor="draftLabel">
          <TextInput id="draftLabel" value={draft.label} onChange={(e) => setDraft({ label: e.target.value })} maxLength={80} placeholder={draft.kind === "INFO" ? "Imported Italian tiles" : "Kitchen"} />
        </Field>
        <div className="flex gap-2">
          <Btn type="submit" size="sm" busy={busy} disabled={draft.kind === "NAVIGATION" && !draft.targetSceneId}>
            Save hotspot
          </Btn>
          <Btn type="button" size="sm" variant="ghost" onClick={cancelDraft}>
            Cancel
          </Btn>
        </div>
      </form>
    </Card>
  );
}

function HotspotList({ scene, scenes }: { scene: TourScene; scenes: readonly TourScene[] }) {
  const { selectedHotspotId, busy, selectHotspot, startMove, updateHotspot, removeHotspot, selectScene } = useTourStudioStore();
  if (scene.hotspots.length === 0) return <p className="text-[12.5px] text-muted">No hotspots in this room yet. Use “Add hotspot” and click inside the view.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {scene.hotspots.map((hotspot) => {
        const selected = hotspot.id === selectedHotspotId;
        const target = scenes.find((s) => s.id === hotspot.targetSceneId);
        return (
          <li key={hotspot.id} className={cn("rounded-xl border px-3 py-2.5", selected ? "border-foreground" : "border-border")}>
            <button type="button" onClick={() => selectHotspot(selected ? null : hotspot.id)} className="focusable flex w-full items-center gap-2 rounded text-left text-[13px] font-medium">
              {hotspot.kind === "NAVIGATION" ? <DoorOpen className="size-4 text-muted" aria-hidden /> : <Info className="size-4 text-muted" aria-hidden />}
              <span className="flex-1 truncate">{hotspot.kind === "NAVIGATION" ? `Door to ${target?.label ?? "a deleted room"}` : hotspot.label}</span>
            </button>
            {selected ? (
              <div className="mt-3 flex flex-col gap-2.5">
                {hotspot.kind === "NAVIGATION" ? (
                  <Field label="Leads to" htmlFor={`target-${hotspot.id}`}>
                    <Select id={`target-${hotspot.id}`} value={hotspot.targetSceneId ?? ""} disabled={busy} onChange={(e) => void updateHotspot(hotspot, { targetSceneId: e.target.value })}>
                      {scenes
                        .filter((s) => s.id !== scene.id)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                    </Select>
                  </Field>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  <Btn size="sm" variant="outline" onClick={() => startMove(hotspot.id)}>
                    <Move className="size-3.5" aria-hidden /> Reposition
                  </Btn>
                  {hotspot.kind === "NAVIGATION" && target ? (
                    <Btn size="sm" variant="outline" onClick={() => selectScene(target.id)}>
                      Go to {target.label}
                    </Btn>
                  ) : null}
                  <Btn size="sm" variant="danger" busy={busy} onClick={() => void removeHotspot(hotspot.id)}>
                    <Trash2 className="size-3.5" aria-hidden /> Remove
                  </Btn>
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function SceneSettings({ scene, scenes, entryId }: { scene: TourScene; scenes: readonly TourScene[]; entryId: string | null }) {
  const replaceInput = useRef<HTMLInputElement>(null);
  const { renameDraft, busy, uploading, setRenameDraft, renameScene, setEntry, moveScene, askRemoveScene, replaceScene } = useTourStudioStore();
  const index = scenes.findIndex((s) => s.id === scene.id);
  return (
    <Card className="flex flex-col gap-4 p-4">
      <form
        noValidate
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void renameScene();
        }}
      >
        <Field label="Room name" htmlFor="roomName" className="flex-1">
          <TextInput id="roomName" value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} maxLength={60} />
        </Field>
        <Btn type="submit" variant="outline" busy={busy} disabled={!renameDraft.trim() || renameDraft.trim() === scene.label}>
          Rename
        </Btn>
      </form>
      <input
        ref={replaceInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Replace 360° photo"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void replaceScene(file);
        }}
      />
      <div className="flex flex-wrap gap-1.5">
        <Btn size="sm" variant="outline" disabled={scene.id === entryId || busy || scene.state !== "READY"} onClick={() => void setEntry(scene.id)}>
          <Flag className="size-3.5" aria-hidden /> {scene.id === entryId ? "Tour starts here" : "Start tour here"}
        </Btn>
        <Btn size="sm" variant="outline" busy={uploading} disabled={busy || scene.state !== "READY"} onClick={() => replaceInput.current?.click()}>
          <Upload className="size-3.5" aria-hidden /> Replace photo
        </Btn>
        <Btn size="sm" variant="ghost" disabled={index <= 0 || busy} onClick={() => void moveScene(scene.id, -1)} aria-label="Move room earlier">
          <ArrowUp className="size-3.5" aria-hidden />
        </Btn>
        <Btn size="sm" variant="ghost" disabled={index === scenes.length - 1 || busy} onClick={() => void moveScene(scene.id, 1)} aria-label="Move room later">
          <ArrowDown className="size-3.5" aria-hidden />
        </Btn>
        <Btn size="sm" variant="danger" onClick={() => askRemoveScene(scene.id)}>
          <Trash2 className="size-3.5" aria-hidden /> Delete room
        </Btn>
      </div>
      <p className="text-[12px] text-muted">
        Starting view: {Math.round(scene.initialYaw)}° · {Math.round(scene.initialPitch)}° · {Math.round(scene.initialFov)}° fov
      </p>
    </Card>
  );
}

function UploadRoom() {
  const input = useRef<HTMLInputElement>(null);
  const { uploadLabel, uploading, uploadError, setUploadLabel, addScene } = useTourStudioStore();
  return (
    <Card className="p-4">
      <p className="text-[13.5px] font-semibold">Add a room</p>
      <p className="mt-1 text-[12px] text-muted">Upload an equirectangular 360° photo (2:1, at least 2048 px wide, JPEG, PNG, or WebP, up to 30 MB).</p>
      <div className="mt-3 flex items-end gap-2">
        <Field label="Room name" htmlFor="newRoom" className="flex-1">
          <TextInput id="newRoom" value={uploadLabel} onChange={(e) => setUploadLabel(e.target.value)} placeholder="Living room" maxLength={60} />
        </Field>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Choose 360° photo"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void addScene(file);
          }}
        />
        <Btn type="button" busy={uploading} disabled={!uploadLabel.trim()} onClick={() => input.current?.click()}>
          <Upload className="size-4" aria-hidden /> Upload
        </Btn>
      </div>
      <div className="mt-3">
        <InlineError message={uploadError} />
      </div>
    </Card>
  );
}

function Studio({ backPath, backLabel }: { backPath: string; backLabel: string }) {
  const params = useParams<{ listingId: string }>();
  const scope = useSessionStore((s) => s.scope);
  const { tour, loading, loadError, sceneId, busy, error, notice, confirmRemoveSceneId, fullscreen, open, close, publish, unpublish, removeScene, askRemoveScene, setFullscreen } =
    useTourStudioStore();
  const listingId = params.listingId;

  useEffect(() => {
    if (scope && listingId) void open(scope, listingId);
    return () => close();
  }, [scope, listingId, open, close]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, setFullscreen]);

  if (!scope) return null;
  if (loading || (!tour && !loadError)) {
    return (
      <Page wide>
        <Skeleton className="mb-6 h-9 w-72" />
        <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
      </Page>
    );
  }
  if (loadError || !tour) {
    return (
      <Page>
        <Card>
          <ErrorState message={loadError ?? "Could not open the tour"} onRetry={() => void open(scope, listingId)} />
        </Card>
      </Page>
    );
  }

  const scene = tour.scenes.find((s) => s.id === sceneId) ?? null;
  const removing = tour.scenes.find((s) => s.id === confirmRemoveSceneId) ?? null;
  const live = tour.state === "PUBLISHED";

  return (
    <Page wide>
      <LinkBtn href={backPath} variant="ghost" size="sm" className="-ml-2 mb-3">
        <ArrowLeft className="size-4" aria-hidden /> {backLabel}
      </LinkBtn>
      <TopBar title="Virtual tour studio" caption={`${tour.scenes.length} room${tour.scenes.length === 1 ? "" : "s"}`}>
        <Badge tone={live ? "ok" : tour.state === "FAILED" ? "bad" : "pending"}>{TOUR_STATE_LABEL[tour.state]}</Badge>
        {live ? (
          <Btn variant="outline" busy={busy} onClick={() => void unpublish()}>
            Unpublish
          </Btn>
        ) : (
          <Btn busy={busy} disabled={!tour.publishable} onClick={() => void publish()}>
            Publish tour
          </Btn>
        )}
      </TopBar>
      {!live && !tour.publishable && tour.problems ? <p className="mb-4 rounded-xl bg-surface-secondary px-4 py-3 text-[13px] text-muted">{tour.problems}</p> : null}
      <div className="mb-4 flex flex-col gap-2">
        <InlineError message={confirmRemoveSceneId ? null : error} />
        {notice ? <p className="rounded-xl bg-success-soft px-3.5 py-2.5 text-[13px] text-success" role="status">{notice}</p> : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          {scene ? (
            <>
              <Viewer scene={scene} scenes={tour.scenes} editable />
              <RoomStrip scenes={tour.scenes} entryId={tour.entrySceneId} />
            </>
          ) : (
            <Card>
              <EmptyState title="No rooms yet" body="Upload your first 360° photo to start the tour. Add more rooms and link them with doors." />
            </Card>
          )}
        </div>
        <aside className="flex flex-col gap-4">
          {scene ? (
            <>
              <DraftForm scenes={tour.scenes} sceneId={scene.id} />
              <SceneSettings scene={scene} scenes={tour.scenes} entryId={tour.entrySceneId} />
              <div>
                <SectionHeading title="Hotspots in this room" />
                <HotspotList scene={scene} scenes={tour.scenes} />
              </div>
            </>
          ) : null}
          <UploadRoom />
        </aside>
      </div>
      <ConfirmDialog
        open={removing !== null}
        title={`Delete ${removing?.label ?? "this room"}?`}
        body="The 360° photo and its hotspots are removed. Doors in other rooms that lead here must be removed first."
        confirmLabel="Delete room"
        tone="danger"
        busy={busy}
        error={error}
        onConfirm={() => void removeScene()}
        onCancel={() => askRemoveScene(null)}
      />
    </Page>
  );
}

export function TourStudio(props: { backPath: string; backLabel: string }) {
  return <Studio {...props} />;
}
