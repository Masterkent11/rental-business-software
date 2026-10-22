# Virtual Tour Pipeline

> **Status:** Written
> **Owner step:** Step 3+ — Integrations
> **Last updated:** 2026-08-20
> **Depends on:** [ADR-0009](../12-adr/0009-media-pipeline.md), [entities.md](../03-domain/entities.md#virtual-tour--scene--hotspot), [invariants.md](../03-domain/invariants.md#i-07--tour-navigation-is-total)
> **Informs:** owner tour authoring, the customer viewer, [05-database](../05-database/)

How a panorama an owner uploads becomes a walkthrough a customer sees.

---

## What this is, and what it is not

**It is not Matterport.** Matterport captures a space with a rig or LiDAR and builds a 3D mesh, which is what produces the dollhouse view, automatic floor plans, and measurement. That is photogrammetry, a capture-hardware dependency, and a different product.

**V1 is 360° panoramas connected by hotspots** (D-07) — a navigable sequence of viewpoints, not a reconstructed model. An owner shoots each room with a 360 camera or a phone's panorama mode and links them.

| | Matterport | This |
|---|---|---|
| Capture | Rig or LiDAR phone | Any 360 camera, or phone panorama |
| Output | 3D mesh + dollhouse + floor plan | Linked 360° scenes |
| Measurement | Yes | No |
| Floor-plan navigation | Yes | **V2** (D-18) |
| Cost per property | Hardware or a paid scan | The owner's own phone |

The last row is the reason. [product-scope.md](../00-overview/product-scope.md#pilot-definition) sets the pilot test as tours **authored by owners themselves, not by the platform team** — a Philippine boarding-house owner with a notebook is not buying a Matterport rig, and if tours only exist when we make them, the feature has not shipped.

---

## The flow, end to end

```
   OWNER APP                      PLATFORM                   CUSTOMER APP
   ─────────                      ────────                   ────────────

   pick a resource
        │
        ▼
   upload panoramas ──POST──▶ API issues signed
   (drag several)             upload URLs
        │                          │
        │  direct to storage       ▼
        └────────────────────▶ Supabase Storage
                                   │  (private bucket)
                                   ▼
                            scene row created
                            processing_state = PROCESSING
                                   │
                                   ▼
                            background worker
                            · tiled pyramid levels
                            · low-res preview
                            · AVIF/WebP + JPEG fallback
                            · thumbnail
                                   │
                                   ▼
                            processing_state = READY
        ┌──────────────────────────┘
        ▼
   scenes appear ready
        │
        ▼
   author hotspots
   (click the pano to place)
        │
        ▼
   press Publish ────────────▶ VALIDATION (I-07)
        │                      · entry scene set?
        │                      · every scene READY?
        │                      · every NAVIGATION hotspot
        │                        targets a live scene?
        │                          │
        │                    fail ─┴─ pass
        │                     │        │
        │◀── refused, with ───┘        ▼
        │    what is wrong       tour PUBLISHED
                                       │
                                       ▼
                                 listing read path
                                 now returns the tour
                                       │
                                       ▼
                                 customer opens it,
                                 preview first,
                                 tiles as they load
```

---

## Why the customer app sees it immediately

There is no sync step, and nothing is copied between apps. Both surfaces are clients of the same API ([P-10](../02-architecture/architecture-principles.md#p-10--every-surface-is-a-client-of-the-same-api)), and the tour hangs off the **rentable resource** — not off the owner's app, and not off the listing.

```
   Rentable Resource ──1:0..1──▶ Virtual Tour ──▶ Scenes ──▶ Hotspots
          │
          └──0:2──▶ Listings   (long-term and nightly both point at the
                                same resource, so both get the same tour)
```

So when the owner publishes, the customer's next read of that listing returns the tour. Two consequences fall out of the same fact:

1. **A `HYBRID` resource gets one tour across both its listings.** The owner authors once; the monthly listing and the nightly listing both show it. Attaching tours to listings would have meant authoring twice and letting them drift.
2. **Unpublishing is immediate too.** A tour taken down disappears from the customer app on the next read, because there is no copy to invalidate.

The only caching is the listing read path, invalidated by the `tour.published` event on the outbox ([ADR-0011](../12-adr/0011-transactional-outbox.md)).

---

## Why processing is not optional

A raw equirectangular panorama is 820 MB. The V1 requirement is a viewer that performs **on a mid-range Android phone over mobile data** ([product-scope.md](../00-overview/product-scope.md#risk-2--virtual-tour-on-the-critical-path)) — sending the original is not a viewer, it is a wait, and it is exactly what turns the differentiator into decoration.

So [ADR-0009](../12-adr/0009-media-pipeline.md) processes at upload, never at view time:

| Derivative | Purpose |
|---|---|
| Low-res preview (~30 KB) | Shows instantly, so the scene is never blank |
| Tiled pyramid | Only the tiles you are looking at download |
| AVIF / WebP + JPEG fallback | Modern encodes where supported |
| Thumbnail | Scene selector and the authoring rail |

**Processing state is domain-visible**, which is why the authoring UI can be honest: a scene that is still processing says so, and the tour cannot be published until every scene is ready.

Because tiles are *derived*, re-encoding to a better format later is a reprocess — owners never re-shoot.

---

## Authoring is a V1 requirement, not polish

The specific risk named in Step 1 is not capture and not playback. It is **authoring**: if placing hotspots is too hard, listings ship without tours and the differentiator evaporates.

What the owner studio does about it:

| Problem | What the UI does |
|---|---|
| "Which room is this?" | Scene label is required before publish, prefilled from the filename |
| "Where do I click?" | Click anywhere on the panorama to drop a hotspot; drag to move it |
| "Does this go anywhere?" | Navigation hotspots pick a target scene from a list; a dangling one is flagged, not silently saved |
| "Is it any good?" | Preview shows exactly what the customer sees, before publishing |
| "Why can't I publish?" | The publish button names every blocker, rather than being disabled with no explanation |

That last row is [I-07](../03-domain/invariants.md#i-07--tour-navigation-is-total) made visible. A dead-end walkthrough on a published listing is worse than no tour, because the customer already trusted it.

---

## Upload mechanics

- **Direct to storage**, using a short-lived signed URL the API issues after checking scope. Panorama files are far too large to proxy through the API.
- **Private buckets**, paths prefixed by `organization_id` ([multi-tenancy.md](../02-architecture/multi-tenancy.md#storage-and-files)).
- **The API records the scene row**; the client never writes domain state, only bytes to a location it was granted (P-02).
- **Resumable uploads**, because this is a phone on Philippine mobile data uploading 15 MB files.

---

## Deliberately not in V1

Floor-plan navigation (D-18), guided tour paths (D-19), AI-generated tours (D-20), voice narration (D-21), VR (D-22), advanced analytics (D-23) — and any form of 3D reconstruction, which was never in scope at all.
