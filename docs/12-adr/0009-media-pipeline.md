# ADR-0009 — Panoramas pre-processed into tiles at upload

**Status:** Accepted · **Date:** 2026-08-20 · **Deciders:** Step 3

## Context

The interactive virtual tour ships in V1 and is on the critical path (D-07). [product-scope.md](../00-overview/product-scope.md#risk-2--virtual-tour-on-the-critical-path) names the requirement precisely: a viewer that performs on mid-range Android phones over mobile data, or the feature is decorative.

A raw equirectangular panorama is 8–20 MB. Sending that to a phone on mobile data is not a viewer; it is a wait.

## Decision

**Process at upload, never at view time.**

On upload, a background job produces: tiled pyramid levels for progressive loading, a low-resolution preview shown immediately, a WebP/AVIF encode with JPEG fallback, and a thumbnail for the scene selector.

**Processing state is domain-visible.** A tour cannot reach `READY` while any scene is still processing, and cannot be published with a navigation hotspot pointing at a missing scene ([I-07](../03-domain/invariants.md#i-07--tour-navigation-is-total)).

Stored in Supabase Storage, private buckets, served through API-issued signed URLs.

## Consequences

**Good**

- The viewer downloads a preview in kilobytes and refines as it loads, which is what makes the tour usable on the target device and network.
- Processing failures surface to the owner at authoring time, not to a customer mid-walkthrough.
- Because tiles are derived, re-encoding to a better format later is a reprocess, not a re-upload — owners never re-shoot.

**Bad, accepted**

- Storage cost multiplies: the original plus every derivative.
- Upload is not instant; the owner waits, and the authoring UI has to make that honest rather than look broken.
- An image-processing dependency in the background worker.

## Alternatives

| Rejected | Why |
|---|---|
| **Serve the original, let the client handle it** | 8–20 MB over mobile data. This is precisely the failure that makes the differentiator decorative |
| **On-the-fly transformation via an image CDN** | First view still pays full cost, and 360° tiling is not a standard CDN transform |
| **A third-party 360° hosting service** | Puts the V1 differentiator behind someone else's roadmap and pricing |

## Revisit when

- Storage cost becomes material relative to its value.
- The viewer's real-world performance is measured on target devices and disagrees with the assumption here.
