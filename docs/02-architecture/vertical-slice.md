# Vertical Slice

> **Status:** Written
> **Owner step:** Step 3 — Architecture
> **Last updated:** 2026-08-20
> **Depends on:** [hexagonal-architecture.md](hexagonal-architecture.md)
> **Informs:** [11-implementation](../11-implementation/) phase boundaries

Hexagonal says which way dependencies point. Vertical slicing says how the code is grouped, and therefore what one person can change without touching everything.

---

## The unit of work is a feature, not a layer

```
   LAYERED (rejected)                 SLICED (chosen)

   controllers/                       features/
     everything                         book-a-stay/
   services/                              route · usecase · queries
     everything                         apply-for-a-rental/
   repositories/                          route · usecase · queries
     everything                         record-offline-payment/
                                          route · usecase · queries
   One change touches
   three folders and                  One change touches
   risks four features.               one folder.
```

A slice owns its route, its use case, its query shapes, and its tests. It does **not** own the domain — that is shared, because [I-01](../03-domain/invariants.md#i-01--no-overlapping-committed-occupancy) cannot be enforced by a feature that keeps its own copy of what occupancy means.

---

## The slices

Named after what the actor is doing, because that is how the journeys are written:

| Slice | Actor | Journey |
|---|---|---|
| `search-listings` | Customer | Discover, filter |
| `view-listing` | Customer | Listing detail, availability |
| `walk-a-tour` | Customer | Tour scenes and hotspots |
| `book-a-stay` | Customer | Dates, hold, prepay |
| `apply-for-a-rental` | Customer | Application with documents |
| `manage-inventory` | Owner, Manager | Properties, resources, pricing |
| `author-a-tour` | Owner | Scenes, hotspots, publishing |
| `publish-a-listing` | Owner, Manager, Admin | Submit, approve, publish |
| `decide-an-application` | Owner, Manager | Approve or reject, place the hold |
| `issue-a-lease` | Owner | Activate, add tenant capability |
| `bill-a-lease` | System, Owner | Recurring invoices |
| `pay-online` | Tenant, Customer | Provider payment |
| `record-offline-payment` | Staff | Cash attestation |
| `settle-a-deposit` | Owner | Inspection, apply, return |
| `report-an-issue` | Tenant, Guest, Staff | Maintenance lifecycle |
| `verify-an-organization` | Platform Admin | Verification queue |
| `moderate-listings` | Platform Admin | Approval queue |

Two of these are worth noticing:

- **`record-offline-payment` is its own slice**, not a variant of `pay-online`. D-09 says recording is not processing; sharing a slice would be the first step toward sharing a code path, and that path ends with a report that cannot tell the two apart.
- **`book-a-stay` and `apply-for-a-rental` are separate slices** that both write occupancy. P-09 in one line.

---

## What is shared, and what that costs

```
   shared kernel (small, stable, heavily tested)
     domain/          entities, invariants, state machines
     ports/           the twelve interfaces
     platform/        transactions, errors, auth context, clock

   slices (many, independent, freely changed)
     features/<slice>/
```

**The shared kernel is deliberately small.** Everything in it is something two slices must agree on or the product breaks. The test: *would two slices disagreeing here be a bug?* Occupancy — yes. A date formatter — no, and it does not belong there.

**Cost:** a change to the shared kernel is a change to everything, so it needs the review weight that implies. The alternative — per-slice copies of domain rules — is how a bed space ends up double-booked because two features disagreed about what "occupied" means.

---

## Queries do not go through the domain

A slice's read path may query the database directly through its own query object, returning a shape built for one screen. It does not load aggregates to render a list.

```
   WRITE:  route ─▶ use case ─▶ domain ─▶ repository ─▶ postgres
   READ:   route ─▶ query ──────────────────────────▶ postgres
```

**Why:** the tenant's "what do I owe right now?" is a projection over invoices and payments. Loading Lease, Invoice, and Payment aggregates to compute it would be slower, more code, and no safer — reads change nothing, so there is no invariant to protect.

**The limit:** a read path may never write, and a write path may never skip the domain. When a slice needs both, they are two objects in one folder, not one object that does both.

---

## How this maps to implementation phases

Step 6 will sequence delivery. The unit it sequences is the slice, and the ordering constraint is already visible: **`book-a-stay` and `apply-for-a-rental` both depend on occupancy**, so occupancy is built first, once, with its concurrency behaviour proven — not twice, differently, by whichever feature got there first.

That is the "treat them as two paths over one resource from the very first sketch" instruction from [product-scope.md](../00-overview/product-scope.md#risk-1--short-term-and-long-term-in-the-same-v1), turned into a build order.
