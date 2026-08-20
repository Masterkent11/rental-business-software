# Occupancy Model

> **Status:** Written
> **Owner step:** Step 2 — Domain Model
> **Last updated:** 2026-08-20
> **Depends on:** [rental-lifecycle.md](../00-overview/rental-lifecycle.md), [glossary.md](../00-overview/glossary.md), [product-scope.md](../00-overview/product-scope.md#rental-modes)
> **Informs:** [entities.md](entities.md), [state-machines.md](state-machines.md), [invariants.md](invariants.md), [05-database](../05-database/), and the availability half of [04-api](../04-api/)

This document answers **[U-01](../00-overview/product-decisions.md#resolved-by-step-2)** and is the most consequential decision in Step 2.

---

## The decision

> **A single Rentable Resource may carry long-term and short-term availability simultaneously.**
>
> There is exactly **one** authoritative occupancy timeline per resource. Every commitment to occupy — long-term or short-term — is an interval on that timeline. The long-term occupancy state and the short-term nightly calendar are **read projections** of it, never independent sources of truth.

`HYBRID` therefore means *"both offers are live at once"*, not *"switchable between modes"*.

### Why

The alternative — mode switching — is genuinely simpler to build, and it was rejected for one reason: it makes the product's own example impossible. [glossary.md](../00-overview/glossary.md#rentable-resource) and [product-scope.md](../00-overview/product-scope.md#rental-modes) both use *Condo Unit 101 — ₱15,000/month long-term **or** ₱1,500/night short-term* as the canonical hybrid. An owner with a vacant condo wants it earning nightly while they wait for a year-long tenant, and wants the long-term listing to stay up the whole time. Mode switching forces them to take one listing down to do that, and to remember to put it back.

The cost is accepted openly: reconciling two inventory models is the hardest thing in the V1 domain. What makes it tractable is refusing to build two inventories at all.

### What this decision is not

It is **not** a decision that long-term and short-term share machinery elsewhere. Pricing, money, screening, and lifecycle stay as divergent as [rental-lifecycle.md](../00-overview/rental-lifecycle.md#the-two-paths-side-by-side) describes. Only *occupancy* is unified — because occupancy is the one question both paths ask about the same physical thing.

---

## The core idea

Both paths already answer the same question in different words:

| Path | Asks | Used to be modelled as |
|---|---|---|
| Long-term | "Is this unit vacant?" | A status column on the resource |
| Short-term | "Are Dec 26–29 open?" | A calendar of nights |

A status column cannot express *"occupied until Aug 31"*, and a nightly calendar cannot express *"leased, open-ended within term"*. Neither can answer the other's question. So the model stores neither, and stores the thing underneath both:

```
                    OCCUPANCY TIMELINE  (Resource: Condo Unit 101)

  Aug          Sep          Oct          Nov          Dec          Jan
   │            │            │            │            │            │
   ├──STAY──┤   ├─STAY─┤        ├─STAY─┤            ├─────LEASE──────────▶
   │ 3 nights   │2 nights       │4 nights          │ 12 months from Dec 1
   │            │               │                  │
   └────────────┴───────────────┴──────────────────┴────────────────────
        ▲                                    ▲
        │                                    │
   short-term projection:              long-term projection:
   "which nights are open"             "vacant until Dec 1,
                                        then occupied"

  Both views are computed from the same intervals. Neither is stored
  as an independent truth, so neither can drift from the other.
```

An **Occupancy** is a half-open interval `[starts_on, ends_on)` over a resource, with a cause. That is the whole primitive.

| Field | Meaning |
|---|---|
| Resource | What is occupied |
| Interval | `[starts_on, ends_on)` — half-open, so a checkout and a check-in on the same day do not collide |
| Cause | The Lease or the Stay that created it. Never null — occupancy without a cause is untraceable |
| Firmness | `HELD` (provisional, expires) or `COMMITTED` (paid/signed) |
| Open-ended | A lease in holdover has no `ends_on` until termination sets one |

### Half-open intervals, stated once

`[Dec 26, Dec 29)` means the guest sleeps the nights of the 26th, 27th, and 28th, and leaves on the 29th. A new occupancy may begin on the 29th. Every interval in the system is half-open, everywhere, without exception. Most double-booking bugs in rental software are an inclusive/exclusive mistake at exactly this boundary.

### Dates versus instants

Occupancy intervals are **calendar dates in `Asia/Manila`**, not instants. "Checked out on the 29th" is a date the owner and the guest both agree on; converting it to an instant introduces a timezone bug and settles nothing useful. Financial and audit events are the opposite — those are `timestamptz` instants in UTC, because "when did the money arrive" is a moment, not a day.

Check-in and check-out *times of day* are property policy (a text term on the listing), not domain state. V1 does not model 2pm check-in as a constraint.

---

## The one rule everything else protects

> **No two `COMMITTED` occupancies of the same resource may overlap.**

This is stated formally in [invariants.md](invariants.md#i-01--no-overlapping-committed-occupancy) as **I-01**. It is the invariant the platform exists to keep, and it is what makes *"a published listing whose resource is occupied is a bug, not a stale cache"* ([rental-lifecycle.md](../00-overview/rental-lifecycle.md#cross-cutting-state-that-flows-back-to-the-marketplace)) a property of the model rather than a promise.

The interesting consequence: **a nightly booking cannot land inside an active lease** — not because booking code checks for leases, but because a lease is already an interval on the timeline and the interval would overlap. Neither path knows about the other. They only know about occupancy.

### Nesting makes it harder, and the rule absorbs it

Resources nest — `Bed A` lives inside `Room 101` lives inside `Unit 203` ([glossary.md](../00-overview/glossary.md#rentable-resource)). So overlap is not only about one resource:

```
Unit 203  ◀── leased whole to a family
   └── Room 101   ◀── must NOT be separately rentable during that lease
        ├── Bed A
        └── Bed B
```

Occupying a resource occupies its **entire subtree and every ancestor**, for the purpose of overlap checking:

- Leasing `Unit 203` blocks `Room 101`, `Bed A`, `Bed B` — you cannot rent out a room inside an occupied unit.
- Occupying `Bed A` blocks `Unit 203` and `Room 101` from being rented *as a whole* — but leaves `Bed B` free.

So **I-01** reads in full: *no two committed occupancies whose resources are on the same ancestor path may overlap in time.* Siblings are independent; ancestors and descendants are not.

This is the rule that makes bed spaces work, and it is why D-04's "`Bed A` is a first-class rentable thing, not an attribute of a room" was load-bearing rather than pedantic.

---

## HELD versus COMMITTED

Availability has to survive the gap between "customer picked dates" and "money arrived". Both paths have that gap, and both use the same mechanism.

```
     Customer selects dates / application approved
                    │
                    ▼
            HOLD placed on the timeline          ← blocks others immediately
            (firmness = HELD, has expires_at)
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
   Payment succeeds        Expires / fails / cancelled
        │                        │
        ▼                        ▼
   COMMITTED                  RELEASED
   (expires_at cleared)    (interval disappears)
```

| | Long-term | Short-term |
|---|---|---|
| Hold placed when | Application is approved | Booking is created |
| Hold covers | The proposed lease term | The selected nights |
| Default expiry | 72 hours (owner-configurable) | 60 minutes |
| Commits on | Advance + deposit received | Full prepayment received |
| On expiry | Application returns to approved-but-unpaid; resource is free again | Dates released back to inventory ([rental-lifecycle.md](../00-overview/rental-lifecycle.md#path-b--short-term-stay)) |

**Holds participate in overlap checking exactly like commitments.** A `HELD` interval blocks other holds and other commitments. Without that, two customers pay for the same nights simultaneously and one of them gets a refund and a bad first impression.

Expiry is a domain event, not a cleanup job that happens to run. An expired hold is treated as released from its `expires_at` instant, whether or not a process has visited it yet — the timeline query filters on expiry rather than trusting a sweeper to have run. The sweeper exists, but only to emit notifications and free storage.

> **Deliberately deferred:** overbooking allowances, waitlists, and "hold my dates while I decide" beyond the expiry above. Not in V1.

---

## The two projections

Nothing outside this model reads raw intervals. Both surfaces read a projection.

### Long-term projection — occupancy state

What owner dashboards and long-term listings display. Computed for a resource *as of a date* (default: today):

| State | Means |
|---|---|
| `VACANT` | No committed or held occupancy covering the date, on this resource or its ancestor path |
| `RESERVED` | A `HELD` occupancy covers it, or a `COMMITTED` one starts in the future |
| `OCCUPIED` | A `COMMITTED` occupancy covers the date |
| `UNAVAILABLE` | A maintenance block covers it, or the resource is archived |

`UNDER_MAINTENANCE` is not a separate mechanism. A maintenance block is an occupancy with cause `MAINTENANCE` and no tenant or guest — which is precisely what "the unit cannot be rented these weeks" means, and it means the same overlap rule protects it for free.

### Short-term projection — nightly calendar

What booking UIs read. For a resource and a date range, each night is `OPEN`, `HELD`, `BOOKED`, `LEASED`, or `BLOCKED`.

The distinction between `BOOKED` and `LEASED` matters to owners (one is a guest, one is a tenant) and matters not at all to a customer, who sees only "unavailable". Cause is carried through the projection and redacted at the surface, rather than being lost in the model.

### Consequence for reads

These projections are read constantly — every search, every listing card, every calendar render — and computing them from raw intervals per request will not survive a marketplace search page. They are cache candidates with an obvious invalidation trigger (any write to the timeline for that resource).

**How** they are materialized is Step 3/Step 4's decision, and this document does not settle it. What this document does settle: the cache is a cache. If it disagrees with the intervals, the intervals are right. Named for the future record: **ADR-0004 — availability projection materialization**.

---

## Rental Mode after this decision

With one timeline, `RentalMode` stops being a state machine and becomes what it always should have been: **a declaration of which offers a resource may carry.**

| Mode | Long-term offer | Short-term offer |
|---|---|---|
| `LONG_TERM` | Allowed | Rejected |
| `SHORT_TERM` | Rejected | Allowed |
| `HYBRID` | Allowed | Allowed, simultaneously |

Mode gates **listing creation and booking/application acceptance**. It does not gate the timeline, and it never switches. Changing a resource's mode is an owner edit with one rule: a mode may not be narrowed while a committed occupancy of the excluded kind exists in the future.

Pricing follows the same shape — a resource carries a monthly rate, a nightly rate, or both, matching its mode. Nightly date overrides are in scope; dynamic and seasonal pricing are not (D-24).

---

## Worked example

*Condo Unit 101*, `HYBRID`, ₱15,000/month or ₱1,500/night. Both listings published.

| # | Event | Timeline write | Long-term view | Nightly view |
|---|---|---|---|---|
| 1 | Owner publishes both listings | — | `VACANT` | all `OPEN` |
| 2 | Guest books Dec 26–29, unpaid | `HELD [Dec 26, Dec 29)`, expires in 60 min | `RESERVED` on those dates | 26–28 `HELD` |
| 3 | Guest pays ₱4,500 | interval → `COMMITTED` | `RESERVED` (future) | 26–28 `BOOKED` |
| 4 | Ana applies long-term from Dec 1 | nothing — an application is not a hold | unchanged | unchanged |
| 5 | Owner approves Ana's application | `HELD [Dec 1, →)`, expires in 72h | — | **rejected**: would overlap the committed Dec 26–29 stay |
| 6 | Owner asks Ana to move in Jan 1 instead | `HELD [Jan 1, →)` accepted | `RESERVED` from Jan 1 | Jan onward closed |
| 7 | Ana pays ₱15,000 advance + ₱30,000 deposit | interval → `COMMITTED`; Lease created; Ana gains Tenant capability | `OCCUPIED` from Jan 1 | Jan onward `LEASED` |
| 8 | Guest checks out Dec 29 | Stay → `COMPLETED`; interval closes | `VACANT` Dec 29 – Dec 31 | 29–31 `OPEN` again |

Step 5 is the whole point. The owner was stopped by the model, at approval time, with a specific reason — not by a support ticket in December.

Note also what step 4 shows: **an application is not a hold.** Several customers may apply for the same resource; only approval takes it off the market. Bookings are the opposite — creating one holds immediately, because payment follows in minutes rather than days.

---

## What this costs

Stated plainly, as the house style requires.

1. **Every availability read goes through a projection.** No `SELECT status FROM resources`. More machinery, and it is not optional.
2. **Write contention on hot resources is real.** Two customers booking the same nights race, and the overlap check must be serializable — a plain read-then-write loses. This is an explicit requirement handed to Step 3/Step 4 (**ADR-0005 — occupancy write serialization**), not a detail to be discovered under load.
3. **The nesting rule makes overlap checks tree-shaped**, not row-shaped. Ancestor paths must be cheap to query. Step 4 inherits this as a hard requirement, not a preference.
4. **Holds need expiry semantics that do not depend on a job having run.** Queries filter expiry; the sweeper is for notification and hygiene only.
5. **Maintenance is now occupancy.** Simpler in the model, but it means blocking a unit for repairs is a write to the same contended timeline.

Every one of these is a cost of *correctness we would have had to buy anyway* the first time a nightly booking landed inside a lease.
