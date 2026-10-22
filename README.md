# Rental Platform

A multi-tenant **rental marketplace + property management platform** for the Philippines.

Property owners digitize their rental operations — properties, units, rooms, bed spaces, parking. Customers discover those rentals, walk through them in an interactive 360° virtual tour, book or apply, pay, and become tenants without ever changing accounts.

```
Owner supplies properties
        ↓
Platform publishes inventory
        ↓
Customer discovers
        ↓
Interactive Virtual Tour
        ↓
Booking / Application
        ↓
Payment
        ↓
Lease  (long-term)   |   Stay  (short-term)
        ↓
Tenant Management
        ↓
Recurring Rent
        ↓
Maintenance
```

## `docs/` is the source of truth

This repository is documentation-first. The domain model and responsibilities are the expensive things to get wrong — not the code — so they are settled in writing before anything is built.

Implementation phases **reference** these documents. They do not re-decide what the documents already decided.

Start at **[docs/README.md](docs/README.md)**.

## Documentation pipeline

```
Step 1  Product Definition   →  docs/00-overview, docs/01-product   ✔ written
Step 2  Domain Model         →  docs/03-domain                      ✔ written
Step 3  Architecture         →  docs/02-architecture, docs/12-adr      ✔ written
Step 4  Database             →  docs/05-database
Step 5  API Contracts        →  docs/04-api
Step 6  Implementation       →  docs/11-implementation
```

Each step is a separate pass, reviewed and frozen before the next begins.

## Current status

| | |
|---|---|
| **Step 1 — Product Definition** | Written, awaiting review |
| **Step 2 — Domain Model** | Written, awaiting review. All five open questions (U-01 … U-05) resolved |
| **Step 3 — Architecture** | Written, awaiting review. ADR-0001 … ADR-0011 |
| Steps 46 | Not started |
| Application code | Three **shells** — customer mobile, tenant web, owner web. See below |

### The application code, and its limits

Three client shells run ahead of the pipeline, so the toolchains, navigation, and design system are proven while the written work continues — not to begin building the product.

| App | Surface | Stack |
|---|---|---|
| `apps/customer_app` | Customer mobile | Flutter 3.24.5 / Dart 3.5.4 |
| `apps/tenant-web` | Tenant web | Next.js 16.3.1 · React 19.2.8 · Tailwind 4 · shadcn/ui · Node 24 LTS |
| `apps/owner-web` | Owner web — the primary management surface | Next.js 16.3.1 · React 19.2.8 · Tailwind 4 · shadcn/ui · Node 24 LTS |

Both are bounded the same way, and the boundary is the point:

| They have | They must not have |
|---|---|
| Pinned toolchains, routing, theming, a shared design language | Any domain rule from [docs/03-domain](docs/03-domain/) |
| Screen shells reading in-memory fixtures | Availability, occupancy, pricing, or balance computation |
| The status vocabulary the journeys define | API clients, real contracts, persistence, or auth |

If an app and the documents ever disagree, **the documents win and the app is changed.** No document is amended to match code. See [customer-app.md](docs/06-frontend/customer-app.md), [tenant-web.md](docs/06-frontend/tenant-web.md), and [owner-web.md](docs/06-frontend/owner-web.md).

There is still no `packages/`, `api/`, or `supabase/` directory. Those arrive when Step 4 defines the schema and Step 5 the contracts — [ADR-0001](docs/12-adr/0001-supabase-api-mediated.md) and [ADR-0002](docs/12-adr/0002-typescript-api-service.md) have already decided what goes in them.

## One naming rule, before anything else

The word *tenant* means two different things in this industry, and confusing them poisons the database schema later. This project settles it permanently:

| Term | Means | Never means |
|---|---|---|
| **Organization** | The SaaS isolation boundary — the business that owns/manages properties | A person renting |
| **Tenant** | A person occupying a rentable resource under a lease | The SaaS boundary |

`organization_id` is multi-tenancy. `tenant_id` is a human being who lives somewhere. See [glossary.md](docs/00-overview/glossary.md).
