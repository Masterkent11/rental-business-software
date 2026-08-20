# System Architecture

> **Status:** Written
> **Owner step:** Step 3 — Architecture
> **Last updated:** 2026-08-20
> **Depends on:** [architecture-principles.md](architecture-principles.md), [03-domain](../03-domain/)
> **Informs:** [09-infrastructure](../09-infrastructure/), [04-api](../04-api/), [06-frontend](../06-frontend/)

The overall shape of the system: what components exist, what each is responsible for, and what is deliberately not a component.

---

## Components

```
┌───────────────────────────── CLIENTS ─────────────────────────────┐
│                                                                   │
│  customer_app (Flutter)          web (Next.js, one codebase)      │
│  iOS · Android                   ├── public listings   (SSR, SEO) │
│  discovery · tour · book         ├── tenant                       │
│  · apply                         ├── owner                        │
│                                  └── super admin                  │
└─────────────────┬─────────────────────────────┬───────────────────┘
                  │                             │
                  │   HTTPS · REST · OpenAPI · JSON                 
                  └──────────────┬──────────────┘
                                 ▼
┌────────────────────────── API SERVICE ────────────────────────────┐
│  TypeScript · Fastify · one deployable                            │
│                                                                   │
│  transport      routes, validation, problem+json errors           │
│  application    use cases, transactions, authorization            │
│  domain         entities, invariants, state machines  ← Step 2    │
│  adapters       postgres · auth · storage · payments · notify     │
└──────┬──────────────┬──────────────┬──────────────┬───────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐
│ PostgreSQL │ │  Supabase  │ │  Supabase  │ │  Payment provider  │
│  + RLS     │ │    Auth    │ │  Storage   │ │  GCash·Maya·card   │
│            │ │ identity   │ │ media +    │ │                    │
│ source of  │ │ only       │ │ panorama   │ │  behind a port     │
│ truth      │ │            │ │ tiles      │ │  (ADR-0008)        │
└────────────┘ └────────────┘ └────────────┘ └────────────────────┘
   └────────────── Supabase project ──────────┘

┌──────────────────────── BACKGROUND ───────────────────────────────┐
│  outbox dispatcher · hold expiry · invoice generation ·           │
│  panorama processing · notification delivery                      │
│  Same codebase, same domain, no HTTP.                             │
└───────────────────────────────────────────────────────────────────┘
```

---

## Responsibilities

### API service

**The only writer of domain state** (P-02). Everything a client does that changes anything goes through it.

| Owns | Does not own |
|---|---|
| Domain rules and invariants | Rendering |
| Transactions and write serialization | Session storage (Supabase Auth holds it) |
| Authorization decisions | Password handling |
| Ledger and audit writes | Panorama encoding (delegated, but orchestrated) |

One deployable, not a set of services. V1 has a handful of Organizations and roughly fifty resources ([product-scope.md](../00-overview/product-scope.md#pilot-definition)); splitting it into services would add operational surface to a system whose hardest problem is a serialized write to one table.

### PostgreSQL

The source of truth, and the place three invariants are enforced structurally rather than hopefully:

| Invariant | Mechanism |
|---|---|
| [I-01](../03-domain/invariants.md#i-01--no-overlapping-committed-occupancy) no overlapping occupancy | `EXCLUDE` constraint over the resource path and date range ([ADR-0005](../12-adr/0005-occupancy-write-serialization.md)) |
| [I-02](../03-domain/invariants.md#i-02--no-cross-organization-references) no cross-org references | Composite foreign keys that include `organization_id` |
| [I-10](../03-domain/invariants.md#i-10--the-ledger-and-audit-log-are-append-only) append-only | Table permissions: the application role holds `INSERT` only |

RLS policies sit on top as the second isolation layer ([multi-tenancy.md](multi-tenancy.md)).

### Supabase Auth

**Identity only.** It answers "who is this person", and nothing else. Capabilities, Organization membership, and staff assignments are resolved from the database on every request ([authentication.md](authentication.md)).

### Supabase Storage

Listing photos, tour panoramas and their tiles, application documents, lease documents, receipts. Private buckets; the API issues short-lived signed URLs. **Application documents and lease documents are never in a public bucket** — they contain government IDs and proof of income.

### Payment provider

Behind a port. No provider name appears in the domain, the schema, or the API contract ([ADR-0008](../12-adr/0008-payment-provider-port.md)). Offline recordings never reach it at all, which is the point of D-09.

### Background work

Same codebase, same domain layer, no HTTP:

| Job | Why it exists |
|---|---|
| Outbox dispatcher | Delivers domain events after commit ([ADR-0011](../12-adr/0011-transactional-outbox.md)) |
| Hold expiry sweeper | Notifies and tidies. **Correctness does not depend on it** — expiry is evaluated on read ([occupancy-model.md](../03-domain/occupancy-model.md#held-versus-committed)) |
| Invoice generation | Raises recurring invoices on each lease's billing day |
| Panorama processing | Tiles and derivatives; gates tour publication ([ADR-0009](../12-adr/0009-media-pipeline.md)) |
| Notification delivery | Push, email, SMS |

---

## What is deliberately not a component

| Not built | Why |
|---|---|
| PostgREST / direct client database access | P-02. The fastest Supabase path is the one that breaks the invariants |
| Supabase Realtime for domain state | Availability is a projection with a rebuild path, not a stream clients subscribe to. Reconsidered post-pilot |
| A separate read service or CQRS split | Projections live in the same database and the same deployable |
| Microservices | See above — V1's hardest problem is one serialized write, not scale |
| GraphQL | [04-api](../04-api/) already owns REST + OpenAPI. Two API styles is two contracts to keep true |
| A message broker | The outbox table is the queue until it demonstrably is not |
| BFF layers per surface | P-10. One API, query shapes designed for the screens that exist |

Each is a decision that can be revisited with evidence — not an omission.

---

## Environments

| | |
|---|---|
| Local | Supabase CLI stack in Docker; API and web run natively |
| Staging | Its own Supabase project. Payment provider in sandbox |
| Production | Its own Supabase project. Nothing shares a database with staging |

Detail belongs to [09-infrastructure](../09-infrastructure/) at Step 6. Fixed here: **environments never share a Supabase project**, because RLS policies and storage buckets are project-scoped and a staging mistake would reach real tenants' documents.

---

## Where the migration path actually is

[ADR-0001](../12-adr/0001-supabase-api-mediated.md) accepts Supabase on the explicit basis that it can be left. That claim is only true if the coupling is countable, so here it is — four adapters and one deployment concern:

| Coupling | Replacement |
|---|---|
| Postgres connection | Any PostgreSQL. The schema is standard SQL; RLS is a Postgres feature, not a Supabase one |
| Supabase Auth adapter | Any OIDC provider, or an in-house identity service. The API already resolves capabilities itself |
| Supabase Storage adapter | S3-compatible storage. Signed URLs are already issued by the API |
| Local dev stack | Docker Compose with Postgres |

**What would make this untrue:** clients calling Supabase directly, RLS policies containing business rules, or Edge Functions holding domain logic. All three are prohibited above, and that prohibition is the migration path.
