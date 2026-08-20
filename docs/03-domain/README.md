# 03 — Domain Model

> **Status:** Written
> **Owner step:** Step 2 — Domain Model
> **Last updated:** 2026-08-20
> **Depends on:** [00-overview](../00-overview/), [01-product](../01-product/)
> **Informs:** [02-architecture](../02-architecture/), [05-database](../05-database/), [04-api](../04-api/), every implementation phase

The domain model is the shape of the business, written down before any technology is chosen. It says what things exist, how they relate, what states they move through, and what must never be true. Architecture, schema, and API all serve this — not the other way round.

This step exists to answer the five questions Step 1 deliberately left open. **All five are now resolved** and recorded in [00-overview/product-decisions.md](../00-overview/product-decisions.md#resolved-by-step-2).

## The documents

| Document | Settles |
|---|---|
| [occupancy-model.md](occupancy-model.md) | **U-01.** The single occupancy timeline — how one resource serves both rental paths without ever double-booking itself |
| [entities.md](entities.md) | Every domain entity, its identity, its owner, and what it is responsible for |
| [relationships.md](relationships.md) | How entities connect, with cardinalities and the aggregate boundaries |
| [state-machines.md](state-machines.md) | Every lifecycle with legal transitions and their triggers |
| [money-model.md](money-model.md) | **U-02.** Invoice, Payment, Ledger, and the deposit as a held balance |
| [invariants.md](invariants.md) | The rules that must hold at all times, and where each is enforced |

## What Step 2 decided

Five questions came in open. Each is answered here, with its consequence stated:

| # | Question | Answer | Where |
|---|---|---|---|
| U-01 | Simultaneous long-term and short-term availability on one resource? | **Yes.** One authoritative occupancy timeline per resource; long-term state and short-term calendar are read projections of it | [occupancy-model.md](occupancy-model.md) |
| U-02 | Deposit — payment, or held balance? | **Held balance** with its own lifecycle. The ledger gains a liability concept in V1 | [money-model.md](money-model.md#deposit-as-a-held-balance) |
| U-03 | Can a Property Manager publish without owner sign-off? | **No by default**, yes when the Owner grants explicit publish delegation on the Organization. Every submission and publish is attributed | [state-machines.md](state-machines.md#listing) |
| U-04 | Does a Stay create a persistent relationship after checkout? | **No tenancy.** The Stay itself persists as history on the User account; the guest never becomes a Tenant | [entities.md](entities.md#guest) |
| U-05 | Maintenance requests against short-term stays? | **Yes** — the anchor is Occupancy, not Lease. Anyone with an active occupancy of a resource may report against it | [entities.md](entities.md#maintenance-request) |

U-01 and U-05 share a root cause worth naming: both looked hard while *Lease* was treated as the centre of the model, and both became straightforward once **Occupancy** was made a first-class concept. That is the single most important structural idea in this step.

## The shape, in one picture

```
Organization ──owns──▶ Property ──▶ Building ──▶ Floor
                            │
                            └──▶ Rentable Resource ◀── nests within itself
                                        │                (unit → room → bed)
                        ┌───────────────┼───────────────┐
                        ▼               ▼               ▼
                    Listing        OCCUPANCY        Virtual Tour
                 (marketplace)     TIMELINE          (scenes,
                        │        the one truth       hotspots)
                        │        about "is it
                        │          taken?"
             ┌──────────┴──────────┐  ▲   ▲
             ▼                     ▼  │   │
        Application            Booking │   │
             │                     │   │   │
             ▼                     ▼   │   │
          LEASE ──────writes───────────┘   │
             │                             │
             │                  STAY ──writes
             ▼                    │
          Tenant                Guest
             │                    │
             └────────┬───────────┘
                      ▼
              Maintenance Request
             (anchored on occupancy)

        Invoice ─▶ Payment ─▶ LEDGER ◀─ Deposit Balance
                              (append-only)
```

Both rental paths write into the same occupancy timeline, and nothing else may. That is what keeps the promise in [rental-lifecycle.md](../00-overview/rental-lifecycle.md#cross-cutting-state-that-flows-back-to-the-marketplace) — a published listing whose resource is occupied is a bug, not a stale cache.

## Conventions

- Entities are named exactly as [glossary.md](../00-overview/glossary.md) names them. A concept the glossary lacks gets a glossary entry before it gets a domain entity.
- Every entity states its **aggregate root**. Invariants are enforced inside an aggregate boundary; anything crossing a boundary is eventually consistent and says so.
- **Money is integer minor units** (centavos, `PHP`). No floating point anywhere near an amount.
- **Time is `timestamptz` in UTC**; occupancy dates are `Asia/Manila` calendar dates, and the difference is deliberate — see [occupancy-model.md](occupancy-model.md#dates-versus-instants).
- State machines list *illegal* transitions where the illegality is non-obvious.

## What this step does not do

- No table definitions, indexes, or column types — that is Step 4.
- No endpoints, payloads, or error shapes — that is Step 5.
- No layering, ports, adapters, or framework choices — that is Step 3.

Where a domain rule implies an architectural one, this step names the future ADR rather than settling it.
