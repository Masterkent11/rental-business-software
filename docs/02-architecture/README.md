# 02 — Architecture

> **Status:** Written
> **Produced by:** Step 3 — Architecture
> **Last updated:** 2026-08-20
> **Depends on:** Step 1 ([00-overview](../00-overview/), [01-product](../01-product/)) and Step 2 ([03-domain](../03-domain/))
> **Informs:** [05-database](../05-database/), [04-api](../04-api/), [06-frontend](../06-frontend/), [08-security](../08-security/), [09-infrastructure](../09-infrastructure/)

How the system is structured to serve the domain: layering, boundaries, multi-tenancy enforcement, identity, and how data moves.

**The domain model came first. This step serves it.** Where a choice here would have forced a change to [03-domain](../03-domain/), the choice was rejected instead.

## The documents

| File | Covers |
|---|---|
| [architecture-principles.md](architecture-principles.md) | The non-negotiable rules every later decision is checked against |
| [system-architecture.md](system-architecture.md) | The overall shape: clients, API, Supabase, and what talks to what |
| [hexagonal-architecture.md](hexagonal-architecture.md) | Ports and adapters; how the domain stays independent of Supabase |
| [vertical-slice.md](vertical-slice.md) | Feature slicing, and where the shared kernel starts and stops |
| [multi-tenancy.md](multi-tenancy.md) | How **Organization** isolation is enforced, in two independent layers |
| [authentication.md](authentication.md) | Identity, sessions, and why capabilities are never read from a token |
| [authorization.md](authorization.md) | Enforcing [roles-and-permissions.md](../01-product/roles-and-permissions.md) and the Step 2 invariants |
| [data-flow.md](data-flow.md) | How a request moves through the system, and the two paths that matter most |

Decisions are recorded as ADRs in [12-adr](../12-adr/). **This directory explains; the ADRs decide.**

## The shape in one picture

```
   Flutter customer app            Next.js web
   (iOS · Android)                 (public listings · tenant ·
        │                           owner · super admin)
        │                                │
        └────────────┬───────────────────┘
                     │  HTTPS · REST · OpenAPI
                     ▼
        ┌─────────────────────────────────┐
        │        API SERVICE              │   the only writer of
        │  ┌───────────────────────────┐  │   domain state
        │  │  adapters (in)            │  │
        │  │  ┌─────────────────────┐  │  │
        │  │  │ application         │  │  │
        │  │  │  ┌───────────────┐  │  │  │
        │  │  │  │   DOMAIN      │  │  │  │  knows nothing about
        │  │  │  │  (Step 2)     │  │  │  │  Supabase, HTTP, or SQL
        │  │  │  └───────────────┘  │  │  │
        │  │  └─────────────────────┘  │  │
        │  │  adapters (out)           │  │
        │  └───────────────────────────┘  │
        └────────────┬────────────────────┘
                     │
     ┌───────────────┼────────────────┬──────────────┐
     ▼               ▼                ▼              ▼
  Postgres      Supabase Auth     Storage      Payment provider
  (+ RLS)       (identity only)   (media)      (GCash/Maya/card)
  └──────────── Supabase ─────────────┘         ← replaceable
```

## What Step 3 decided

| # | Decision | Where |
|---|---|---|
| ADR-0001 | **Supabase as the platform, API-mediated.** Clients never touch the database directly | [ADR-0001](../12-adr/0001-supabase-api-mediated.md) |
| ADR-0002 | **A standalone TypeScript API service**, not Edge Functions | [ADR-0002](../12-adr/0002-typescript-api-service.md) |
| ADR-0003 | **Hexagonal core with vertical feature slices** | [ADR-0003](../12-adr/0003-hexagonal-vertical-slice.md) |
| ADR-0004 | **Availability projections are materialized tables**, rebuilt from the timeline | [ADR-0004](../12-adr/0004-availability-projection.md) |
| ADR-0005 | **Occupancy writes serialize on the resource root** via an exclusion constraint plus an advisory lock | [ADR-0005](../12-adr/0005-occupancy-write-serialization.md) |
| ADR-0006 | **RLS is enforced, not bypassed.** The API connects as a role RLS applies to | [ADR-0006](../12-adr/0006-multi-tenancy-enforcement.md) |
| ADR-0007 | **Supabase Auth for identity only.** Capabilities are resolved server-side, never read from the token | [ADR-0007](../12-adr/0007-identity-and-sessions.md) |
| ADR-0008 | **Payments sit behind a port.** No provider name appears in the domain | [ADR-0008](../12-adr/0008-payment-provider-port.md) |
| ADR-0009 | **360° panoramas are pre-processed into tiles** at upload, never at view time | [ADR-0009](../12-adr/0009-media-pipeline.md) |
| ADR-0010 | **Next.js App Router + TypeScript** for every web surface | [ADR-0010](../12-adr/0010-web-stack.md) |
| ADR-0011 | **Domain events via a transactional outbox** | [ADR-0011](../12-adr/0011-transactional-outbox.md) |

## Constraints this step inherited

Fixed before Step 3 began, and not re-decided here:

- **Organization** is the isolation boundary; *tenant* never means platform tenancy (D-13).
- The ledger is append-only; corrections are new entries ([I-10](../03-domain/invariants.md#i-10--the-ledger-and-audit-log-are-append-only)).
- Online payments and offline recordings stay permanently distinguishable ([I-08](../03-domain/invariants.md#i-08--payment-origin-is-immutable)).
- Every cross-organization access is logged ([I-09](../03-domain/invariants.md#i-09--privileged-access-is-always-logged)).
- One occupancy timeline per resource, with no overlapping commitments ([I-01](../03-domain/invariants.md#i-01--no-overlapping-committed-occupancy)).

Every one of these is an architectural obligation, not a coding convention. Where this step could not satisfy one with a library or a platform feature, it said so and specified the mechanism instead.
