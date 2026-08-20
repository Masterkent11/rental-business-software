# ADR-0010 — Next.js App Router + TypeScript for every web surface

**Status:** Accepted · **Date:** 2026-08-20 · **Deciders:** Step 3

## Context

Four web surfaces are in V1 scope ([product-scope.md](../00-overview/product-scope.md#product-surfaces)): public listings, tenant web, owner web, and super admin web. Only the customer mobile app is Flutter.

The surfaces have genuinely different needs. Public listings exist for **search-engine reach**, so they need server rendering. Tenant, owner, and admin are authenticated application screens where SEO is irrelevant and form and table density matter.

## Decision

**Next.js App Router with TypeScript, Tailwind, and shadcn/ui**, for all four surfaces.

Server components call the API service; the Supabase SSR client handles the session cookie. Design tokens are shared with the Flutter app by value — same palette, same spacing rhythm — so the product looks like one product.

Tenant web is built first ([tenant-web.md](../06-frontend/tenant-web.md)).

## Consequences

**Good**

- One stack serves both the SEO surface and the authenticated ones. The alternative is two stacks and a seam between them.
- TypeScript end to end with the API ([ADR-0002](0002-typescript-api-service.md)): shared money handling, shared generated types from OpenAPI, one language for the whole non-mobile product.
- shadcn/ui is copied into the repo rather than imported as a dependency, so the components are ours to restyle — which matters because the design language is already set by the mobile app.
- The largest ecosystem for the table- and form-heavy owner and admin screens.

**Bad, accepted**

- The App Router's server/client boundary is a real thing to learn and a real place to make mistakes.
- Next.js releases move fast; the toolchain needs deliberate pinning ([web-toolchain.md](../06-frontend/web-toolchain.md)).
- shadcn components live in the repo, so upstream fixes are pulled deliberately rather than received automatically.

## Alternatives

| Rejected | Why |
|---|---|
| **Vite + React SPA** | No SSR, so public listings would need a second stack — the exact seam this decision avoids |
| **SvelteKit** | Smaller and faster, with a much smaller ecosystem for the admin-table and form work that dominates owner and super admin |
| **Nuxt** | Equivalent capability; no advantage here without an existing Vue team |
| **Flutter web for the tenant surface** | Rejected explicitly. Poor SEO, heavy initial payload, and the wrong idiom for document-and-table screens |

## Revisit when

A surface's needs diverge enough that sharing a stack costs more than it saves — most plausibly super admin, if it becomes tooling-heavy rather than product-like.
