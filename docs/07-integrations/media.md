# Virtual tours — as built

> **Status:** Written (Sprint 6)
> **Owner step:** Step 7 — Integrations
> **Last updated:** 2026-08-23
> **Depends on:** [ADR-0009](../12-adr/0009-media-pipeline.md), [I-07](../03-domain/invariants.md#i-07--tour-navigation-is-total)

The tour is the differentiator and sits on the critical path (D-07). A weak
viewer makes it decorative, so this records what actually ships.

## What this is not

A lightweight property walkthrough: panoramas joined by doors. Deliberately
**not** 3D reconstruction, point clouds, a dollhouse view, mesh generation, or
measurement. Those solve a surveying problem; a renter is deciding whether a
place is worth the jeepney fare.

## The pipeline

Processing happens **at upload, never at view time**.

```
owner uploads equirectangular JPEG
        ↓  sharp, in the API process
preview   512×256 webp     ~1 KB     ← first paint
thumbnail 320×160 webp     ~0.5 KB   ← scene selector
level 0   1024×512          2 tiles   ~8 KB
level 1   2048×1024         8 tiles  ~141 KB
level 2   4096×2048        32 tiles  ~2.5 MB
```

Measured on a real upload through the running API. Reproduce with
`apps/api/scripts/panorama-budget.mjs`.

**A usable first view costs about 9 KB** — preview plus level 0 — against a
4.4 MB original. That ratio is the whole reason the pipeline exists.

### What is refused, and why it says so in plain words

| Upload | Message |
|---|---|
| Ordinary phone photo (16:9) | "A 360° photo should be twice as wide as it is tall." |
| Panorama under 2048px wide | "…too small to look sharp on a phone." |
| Anything unreadable | "Upload a JPEG or PNG taken with a 360° camera." |

Not "aspect ratio 1.78" — an owner needs to know what to upload instead.

A rejected upload still creates the room, in `FAILED` with the reason attached.
An upload that vanishes leaves the owner re-uploading the same file.

## Storage and access

Derivatives live in a **private** `tour-media` bucket. Every read is a
short-lived signed URL issued by the API.

Tiles are served through `GET /tiles/{sceneId}/{level}/{x}/{y}`, which **302s**
to a signed storage URL. A redirect rather than a proxy: the bytes go straight
from storage to the phone, so a customer looking around does not pull every
tile through an API worker. Tiles are immutable, so they cache hard.

Unpublishing a tour makes both the tour **and its tiles** 404 immediately —
verified, not assumed.

## I-07 is one rule in one place

`assertPublishable` in `domain/tours/tour.ts` is the only implementation. The
authoring flow calls it; the readiness endpoint calls it; nothing duplicates it.

It refuses, and reports **every** problem at once so an owner is not playing
whack-a-mole through five save attempts:

- no rooms at all
- no entry scene chosen
- entry scene not ready
- a room that failed processing, named with its reason
- rooms still processing
- a door with no target
- **a door whose target is no longer in this tour**
- **a door whose target exists but is not ready**

The last two are deliberately different sentences. One sends the owner looking
for a deleted room; the other tells them to wait. I-07 has two conditions and
they are not the same problem.

The schema backs this up: `tour_hotspots.target_scene_id` is `ON DELETE
RESTRICT`, so the database refuses to create the dangling door in the first
place.

## The viewer

`PanoramaView` projects the equirectangular texture with a **fragment shader**,
so the reprojection runs on the GPU. Doing it in Dart per frame cannot hold a
frame budget on the mid-range Android phone this feature targets — which is
also why no 3D mesh package was added.

**Web falls back to a flat pan.** Flutter web does not support image samplers in
fragment shaders: the program compiles, then `setImageSampler` throws at paint
time. The painter catches that once and switches to a cylindrical pan —
geometrically wrong (verticals bow) but it shows the room, which beats a black
rectangle. Mobile uses the shader.

### Progressive loading

`PanoramaSource` never waits for a better image before showing a worse one:

1. preview → on screen
2. level 0 → composited from 2 tiles, replaces the preview
3. level 1 at moderate zoom, level 2 only when the customer really leans in

It **never fetches the 4.4 MB source**. That file exists so tiles can be
regenerated later; downloading it to look at a room would defeat the pipeline.
There is a test asserting no request touches it.

A failed refinement keeps what is on screen — a lost level-1 tile is not a lost
room. An error surfaces only when there is nothing to show at all.

### Hotspots

Positioned by **bearing**, not pixels: `projectHotspot` runs the same maths as
the shader for one point, so a door stays on the door as the customer looks
around and zooms. Behind the camera, it is not drawn.

Labels and destinations come from tour data. Nothing is hard-coded.

## Owner authoring

`POST /organizations/{org}/tours` → `POST …/scenes` (base64 panorama) →
`PUT …/entry` → `POST …/scenes/{id}/hotspots` → `POST …/publish`.

Base64 inside JSON rather than multipart: one content type across the API and no
parser dependency for the single endpoint that takes a file. The cost is a third
more bytes, paid once per room at authoring time, never on the customer's path.
Fastify's body limit is raised to 40 MB to clear a 25 MB upload plus that third.

`GET …/tours/{id}` returns the tour **and** its readiness, so the authoring
screen can show what is missing while the owner works rather than only when they
press publish.

## Not built

- **A background worker.** Processing runs inline in the request; a 4 MB
  panorama takes a couple of seconds. ADR-0009 anticipates moving it out, and
  `PanoramaProcessor` is a port so that is an adapter change.
- **Hotspot authoring UI.** The endpoints exist and are tested; the owner web
  has no placement tool yet.
- **Reprocessing.** The original is kept for it; nothing triggers it.
- **The Android performance gate.** See below.

## Story 6.4 — the gate is UNVERIFIED

The requirement is *"preview visible under 2 seconds on a mid-range Android over
throttled 4G."*

**It has not been tested, and must not be recorded as passed.** There is no
Android device, no `adb`, and no Android SDK on this machine. Byte budgets and
desktop timings are evidence about the pipeline, not certification of the gate:
a mid-range phone's decode speed and GPU are precisely what the requirement is
about.

To run it:

1. `flutter run --release -d <device> --dart-define=API_BASE_URL=<reachable API>`
2. Chrome DevTools → `chrome://inspect`, or Android Studio Profiler, with
   network throttled to a 4G profile (~4 Mbps down, 100 ms RTT).
3. Open a listing with a published tour, tap **Walk through it**, and measure
   from tap to the first painted panorama frame.
4. Record device model, Android version, throttle profile, and the timing.

The number to beat is 2 seconds to first paint, not to full sharpness.
