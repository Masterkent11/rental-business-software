# Documentation Index

> **Status:** Steps 13 written, Steps 46 not started
> **Last updated:** 2026-08-20

This directory is the engineering source of truth for the rental platform. Every implementation phase reads from here. **No phase re-decides something a document already decided** — if a phase disagrees with a document, the document is amended first, deliberately, and the change is recorded in [00-overview/product-decisions.md](00-overview/product-decisions.md).

## How to read this

If you are new to the project, read in this order:

1. [00-overview/vision.md](00-overview/vision.md) — what we are building and why
2. [00-overview/glossary.md](00-overview/glossary.md) — the vocabulary, before it can be misused
3. [00-overview/rental-lifecycle.md](00-overview/rental-lifecycle.md) — how a rental actually flows, end to end
4. [00-overview/product-scope.md](00-overview/product-scope.md) — what V1 is and is not
5. [00-overview/product-decisions.md](00-overview/product-decisions.md) — the canonical decision register

If you are about to implement something, read the journey doc for the actor you are building for, then [01-product/roles-and-permissions.md](01-product/roles-and-permissions.md).

## The tree

| Section | Owns | Produced by | Status |
|---|---|---|---|
| [00-overview](00-overview/) | Vision, scope, vocabulary, personas, lifecycle, payments model, decision register | Step 1 | **Written** |
| [01-product](01-product/) | One journey per actor, product-level capability matrix | Step 1 | **Written** |
| [02-architecture](02-architecture/) | System architecture, hexagonal, vertical slice, multi-tenancy, authn/authz, data flow | Step 3 | **Written** |
| [03-domain](03-domain/) | Domain entities, relationships, state machines, invariants, occupancy and money models | Step 2 | **Written** |
| [04-api](04-api/) | API guidelines, errors, pagination, idempotency, OpenAPI | Step 5 | Not started |
| [05-database](05-database/) | PostgreSQL schema, tenancy columns, indexes, constraints, migrations | Step 4 | Not started |
| [06-frontend](06-frontend/) | Per-surface frontend docs, design system | Step 3+ | Customer, tenant, and owner shells |
| [07-integrations](07-integrations/) | Payments, storage, maps, notifications, AI providers | Step 3+ | Virtual tour pipeline |
| [08-security](08-security/) | Security model, RBAC, RLS, data privacy, audit logging | Step 3+ | Not started |
| [09-infrastructure](09-infrastructure/) | Environments, Docker, deployment, observability, DR | Step 6 | Not started |
| [10-testing](10-testing/) | Testing strategy and per-level testing docs | Step 6 | Not started |
| [11-implementation](11-implementation/) | Roadmap, phase documents, progress, Definition of Done | Step 6 | Not started |
| [12-adr](12-adr/) | Architecture Decision Records | Step 3 onward | **ADR-0001 … ADR-0011** |

## Step 1 documents

### 00-overview

| Document | What it settles |
|---|---|
| [vision.md](00-overview/vision.md) | The product, the value loop, pilot success, and what we are explicitly not building |
| [product-scope.md](00-overview/product-scope.md) | V1 scope by actor and rental type, virtual tour split, product surfaces, rental modes, non-goals, scope risks |
| [product-decisions.md](00-overview/product-decisions.md) | **Canonical register** of Locked / Deferred / Unresolved decisions |
| [glossary.md](00-overview/glossary.md) | Every domain term, with the Organization-vs-Tenant rule and Listing-vs-Rentable-Resource distinction |
| [personas.md](00-overview/personas.md) | The eight personas, their goals, pains, and primary surfaces |
| [rental-lifecycle.md](00-overview/rental-lifecycle.md) | The long-term and short-term paths, drawn separately |
| [payments-overview.md](00-overview/payments-overview.md) | Online payment vs offline payment recording, and why they are not the same thing |

### 01-product

| Document | Actor |
|---|---|
| [customer/journey.md](01-product/customer/journey.md) | Customer |
| [tenant/journey.md](01-product/tenant/journey.md) | Tenant |
| [owner/journey.md](01-product/owner/journey.md) | Property Owner |
| [property-staff/journey.md](01-product/property-staff/journey.md) | Property Manager, Staff |
| [platform-admin/journey.md](01-product/platform-admin/journey.md) | Platform Admin, Support, Finance |
| [roles-and-permissions.md](01-product/roles-and-permissions.md) | Product-level capability matrix — the requirement `08-security/rbac.md` will implement |

## Step 2 documents

### 03-domain

| Document | What it settles |
|---|---|
| [occupancy-model.md](03-domain/occupancy-model.md) | **U-01** — the single occupancy timeline, and how one resource serves both rental paths without ever double-booking itself |
| [entities.md](03-domain/entities.md) | Every entity, its aggregate root, its scope, and its responsibilities. Answers **U-04** and **U-05** |
| [relationships.md](03-domain/relationships.md) | Cardinalities, aggregate boundaries, and where multi-tenancy attaches |
| [state-machines.md](03-domain/state-machines.md) | Every lifecycle with its legal transitions. Answers **U-03** |
| [money-model.md](03-domain/money-model.md) | **U-02** — invoice, payment, ledger, and the deposit as a held balance |
| [invariants.md](03-domain/invariants.md) | I-01 … I-15, with where each is enforced |

All five of Step 1's open questions are resolved; see [Resolved by Step 2](00-overview/product-decisions.md#resolved-by-step-2).

## Step 3 documents

### 02-architecture

| Document | What it settles |
|---|---|
| [architecture-principles.md](02-architecture/architecture-principles.md) | P-01 … P-12 — the rules every later decision is checked against |
| [system-architecture.md](02-architecture/system-architecture.md) | Components, responsibilities, and what is deliberately *not* a component |
| [hexagonal-architecture.md](02-architecture/hexagonal-architecture.md) | The twelve ports, and how the domain stays independent of Supabase |
| [vertical-slice.md](02-architecture/vertical-slice.md) | The seventeen slices, and what the shared kernel may contain |
| [multi-tenancy.md](02-architecture/multi-tenancy.md) | Two independent isolation layers, and why the API never uses `service_role` |
| [authentication.md](02-architecture/authentication.md) | Identity, and why capabilities are never read from a token |
| [authorization.md](02-architecture/authorization.md) | Capability + scope + ownership, and the four rules nobody can be granted |
| [data-flow.md](02-architecture/data-flow.md) | The contended booking write and the cash-recording write, step by step |

### 12-adr

Eleven decisions, [indexed here](12-adr/). Two of them — [ADR-0004](12-adr/0004-availability-projection.md) and [ADR-0005](12-adr/0005-occupancy-write-serialization.md) — were **named by Step 2 before Step 3 existed**: the domain model identified them as decisions it must not make for itself and reserved the numbers.

The platform decision is [ADR-0001](12-adr/0001-supabase-api-mediated.md): **Supabase, API-mediated**, accepted on the explicit condition that it stays replaceable — a condition [hexagonal-architecture.md](02-architecture/hexagonal-architecture.md) turns into twelve countable ports.

## Frontend, ahead of schedule

Two client shells exist ahead of Steps 45, both **deliberate exceptions** to the documentation-first rule and both bounded the same way — UI shell and fixture data only, no domain rules, no availability or balance computation, no API contracts:

| App | Surface | Stack | Doc |
|---|---|---|---|
| [`apps/customer_app`](../apps/customer_app) | Customer mobile | Flutter 3.24.5 | [customer-app.md](06-frontend/customer-app.md) · [flutter-toolchain.md](06-frontend/flutter-toolchain.md) |
| [`apps/tenant-web`](../apps/tenant-web) | Tenant web | Next.js 16.3.1 | [tenant-web.md](06-frontend/tenant-web.md) · [web-toolchain.md](06-frontend/web-toolchain.md) |
| [`apps/owner-web`](../apps/owner-web) | Owner web | Next.js 16.3.1 | [owner-web.md](06-frontend/owner-web.md) · [web-toolchain.md](06-frontend/web-toolchain.md) |

Nothing in `docs/` may be changed to match either. If an app and a document disagree, the document wins.

## Document conventions

Every document opens with a front block:

```
Status:        Draft | Written | Frozen
Owner step:    which of Steps 16 produces it
Last updated:  ISO date
Depends on:    documents that must be read first
Informs:       documents and phases that consume it
```

Beyond that:

- **Diagrams are inline** — ASCII or mermaid. No binary assets, no external image files.
- **Decisions are stated with their consequence.** A bare bullet saying what we chose is not enough; the reader must be able to see what it costs.
- **Product docs do not make technical decisions.** Where a product statement implies an architectural one, it names the future ADR rather than settling it early.
- **Money is concrete.** Examples use realistic Philippine amounts so scope conversations stay grounded: ₱15,000/month condo, ₱8,500/month unit, ₱3,500/month bed space, ₱1,500/night short stay.

## Status vocabulary

| Status | Meaning |
|---|---|
| **Draft** | Being written; may contradict itself |
| **Written** | Complete and internally consistent; awaiting human review |
| **Frozen** | Reviewed and accepted; changing it requires a deliberate amendment and a decision-register entry |

Step 1 is **Written**. It becomes **Frozen** only after `product-scope.md`, `glossary.md`, `rental-lifecycle.md`, `roles-and-permissions.md`, and `product-decisions.md` have been reviewed — those five are the contract the domain model will be designed against.
