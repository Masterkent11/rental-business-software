# Invariants

> **Status:** Written
> **Owner step:** Step 2 — Domain Model
> **Last updated:** 2026-08-20
> **Depends on:** [occupancy-model.md](occupancy-model.md), [entities.md](entities.md), [money-model.md](money-model.md)
> **Informs:** [05-database](../05-database/) constraints, [08-security](../08-security/), [10-testing](../10-testing/)

Things that must be true at all times. If one of these is false, the system is wrong — not degraded, not stale. **Wrong.**

Each invariant names where it is enforced. "Aggregate" means synchronously, inside a transaction, by the domain. "Database" means a constraint exists as well, because domain code is not the only thing that will ever write to that table.

---

## I-01 — No overlapping committed occupancy

> No two `HELD` or `COMMITTED` occupancies whose resources lie on the same ancestor path may overlap in time.

**Enforced at:** Rentable Resource aggregate, synchronously, **and** as a database exclusion constraint.

This is the invariant the platform exists to keep. Everything in [occupancy-model.md](occupancy-model.md) is machinery for it.

```
   Unit 203   ├──────LEASE──────────────▶            ancestor path:
      │                                              203
      └── Room 101      ✗ cannot be occupied         203 → 101
             │                                       203 → 101 → A
             └── Bed A   ✗ cannot be occupied

   Room 102  ├──STAY──┤   ✓ legal — different path from Unit 203? No:
                          102 is also inside 203, so this is ALSO blocked.

   Bed A ├──LEASE──▶      Bed B ├──LEASE──▶   ✓ legal — siblings, and
                                              neither is an ancestor of
                                              the other.
```

**Consequences:**

- A nightly booking cannot land inside an active lease — not because booking code checks leases, but because the interval would overlap.
- Two customers cannot pay for the same nights; the loser is refused before payment, not refunded after.
- The overlap check is **tree-shaped, not row-shaped**. Ancestor paths must be cheap to query — a hard requirement handed to Step 4.
- The check must be **serializable**. A read-then-write loses under concurrency, and two guests booking the same Christmas week is precisely when it matters (**ADR-0005 — occupancy write serialization**).
- Expired holds do not block. Expiry is evaluated **on read**, so correctness never depends on a sweeper having run.

**Deliberately not enforced:** overbooking allowances. V1 has none.

---

## I-02 — No cross-Organization references

> Every foreign key between Organization-scoped entities stays within one Organization.

**Enforced at:** database (composite constraints including `organization_id`), **and** at the access boundary.

A Lease in Organization A can never reference a Resource in Organization B. Not by bug, not by admin action, not by data migration. This is the isolation boundary (D-13), and it must be checkable at the row rather than by walking joins ([relationships.md](relationships.md#multi-tenancy-how-isolation-actually-attaches)).

**Corollary:** every Organization-scoped read is filtered by `organization_id`. A query without that filter is a defect regardless of what it returns today.

**The exception, stated explicitly:** Platform Admin, Support, and Finance cross Organizations by design. **Every such access is logged** ([I-09](#i-09--privileged-access-is-always-logged)).

---

## I-03 — Publishing requires two gates

> A Listing may be `PUBLISHED` only if its Organization is `VERIFIED` and the Listing itself is `APPROVED`.

**Enforced at:** Listing aggregate.

Two different gates, decided by different people about different things (D-11, D-12, [glossary.md](../00-overview/glossary.md#approval)). Neither implies the other: a verified Organization still gets every listing reviewed; an approved listing stays private while its Organization is unverified or suspended.

**Corollary:** losing verification unpublishes. If an Organization is suspended, its published listings go `UNPUBLISHED` — they do not stay live pointing at a business the platform no longer vouches for.

---

## I-04 — An invoice is never overpaid

> `amount_paid ≤ total`, always.

**Enforced at:** Invoice aggregate, **and** database check constraint.

Money beyond an invoice total is an **unapplied credit** against the lease, not an overpaid invoice ([money-model.md](money-model.md#payment)). The distinction is what lets an owner answer "does this tenant owe anything?" without reading history.

---

## I-05 — A lease cannot close with an unsettled deposit

> A Lease reaches `CLOSED` only when its Deposit Balance is `SETTLED`.

**Enforced at:** Lease aggregate.

Even a settlement of ₱0 is an explicit event with a date and an actor. There is no `ACTIVE ──▶ CLOSED` edge ([state-machines.md](state-machines.md#lease)). Unsettled deposits are how tenants lose money quietly.

---

## I-06 — Deposit arithmetic always balances

> `held = applied + returned` for every Deposit Balance, at every moment. Every application cites an invoice or an inspection finding.

**Enforced at:** Lease aggregate, **and** database check constraint.

The second sentence carries as much weight as the first. An unexplained deduction is not expressible — not discouraged, not flagged, **not expressible** ([money-model.md](money-model.md#deposit-as-a-held-balance)).

---

## I-07 — Tour navigation is total

> A `PUBLISHED` Virtual Tour has an entry Scene, and every `NAVIGATION` hotspot targets a Scene that exists in the same tour and is `READY`.

**Enforced at:** Virtual Tour aggregate.

The tour is on the V1 critical path (D-07) and is the differentiator. A dead-end walkthrough on a published listing is worse than no tour, because the customer already trusted it ([product-scope.md](../00-overview/product-scope.md#risk-2--virtual-tour-on-the-critical-path)).

---

## I-08 — Payment origin is immutable

> A Payment's `origin` is set at creation and never changes. `ONLINE` requires a provider reference; `OFFLINE_RECORDED` requires a recording User and has no provider reference, ever.

**Enforced at:** Payment aggregate, **and** database check constraint.

D-09 in one rule. No admin override, no correction flow, no migration. Correcting a mistaken offline recording is a **new opposing entry** ([money-model.md](money-model.md#payment)).

**Corollary for reporting:** no report, export, or receipt may present an offline recording as though the platform processed the money. That is a domain rule, not a UI preference ([payments-overview.md](../00-overview/payments-overview.md)).

---

## I-09 — Privileged access is always logged

> Every access by a Platform Admin, Support, or Finance user to Organization-scoped data writes an Audit Log Entry naming the actor, the Organization, the record, and the time.

**Enforced at:** the access boundary. Logging is a precondition of the read, not a side effect of it.

Fixed by Step 1 ([02-architecture/README.md](../02-architecture/README.md#constraints-already-fixed-by-step-1)). Support looking up a tenant's payment history is legitimate and must leave a trace.

---

## I-10 — The ledger and audit log are append-only

> No update or delete path exists for a Ledger Entry or an Audit Log Entry. Corrections are new entries referencing the original.

**Enforced at:** Organization aggregate, **and** database permissions — the writing role holds `INSERT` only.

A product requirement, not an implementation preference ([payments-overview.md](../00-overview/payments-overview.md#who-may-do-what)). If a correction can be made to look like it never happened, the offline payment path has no defence at all.

---

## I-11 — Capabilities are additive

> Granting a Capability never removes another. A User who becomes a Tenant remains a Customer.

**Enforced at:** User aggregate.

D-15 and D-16. Revocation happens when a cause ends — a lease closing, a staff member leaving — and is recorded, never a silent delete ([entities.md](entities.md#capability)).

**Corollary:** no code may branch on "is this user a customer *or* a tenant". Both are true simultaneously and routinely.

---

## I-12 — A short-term Stay creates no tenancy

> No Stay references a Lease. No Stay grants the `TENANT` capability. The `GUEST` capability lapses at checkout.

**Enforced at:** Booking aggregate, **and** by the absence of any such relationship in the schema.

[U-04](entities.md#guest). The Stay persists as **history** on the User account; the relationship does not. The strongest enforcement here is structural — there is no column to misuse ([relationships.md](relationships.md#the-absent-relationships-are-decisions-too)).

---

## I-13 — A Property is not rentable

> No Listing, Occupancy, Lease, or Booking references a Property, a Building, or a Floor. They reference a Rentable Resource.

**Enforced at:** schema — the foreign keys do not exist.

Nobody rents "ABC Apartment"; they rent Unit 203 ([glossary.md](../00-overview/glossary.md#property)).

---

## I-14 — Rental mode gates offers, never occupancy

> A resource's `RentalMode` determines which listing kinds and which commitment types it may accept. It never gates the occupancy timeline, and it never switches automatically.

**Enforced at:** Rentable Resource aggregate.

The direct consequence of U-01 ([occupancy-model.md](occupancy-model.md#rental-mode-after-this-decision)). A mode may not be narrowed while a committed occupancy of the excluded kind exists in the future.

---

## I-15 — Every occupancy has a live cause

> Every Occupancy references a Lease, a Stay, or a Maintenance Block that exists and is in a state consistent with it.

**Enforced at:** Rentable Resource aggregate.

Occupancy with no cause is inventory nobody can explain and nobody dares release — the state that produces "the system says it's taken but nobody's living there".

---

## Enforcement summary

| # | Invariant | Aggregate | Database | Access boundary |
|---|---|---|---|---|
| I-01 | No overlapping occupancy | ✓ | ✓ exclusion | |
| I-02 | No cross-Organization references | | ✓ composite FK | ✓ |
| I-03 | Publishing requires two gates | ✓ | | |
| I-04 | Invoice never overpaid | ✓ | ✓ check | |
| I-05 | No close with unsettled deposit | ✓ | | |
| I-06 | Deposit arithmetic balances | ✓ | ✓ check | |
| I-07 | Tour navigation is total | ✓ | | |
| I-08 | Payment origin immutable | ✓ | ✓ check | |
| I-09 | Privileged access logged | | | ✓ |
| I-10 | Ledger append-only | ✓ | ✓ permissions | |
| I-11 | Capabilities additive | ✓ | | |
| I-12 | Stay creates no tenancy | ✓ | ✓ absence | |
| I-13 | Property is not rentable | | ✓ absence | |
| I-14 | Mode gates offers only | ✓ | | |
| I-15 | Every occupancy has a live cause | ✓ | ✓ FK | |

Three of these are enforced by **absence** — I-12, I-13, and part of I-02. A relationship that does not exist cannot be misused by a query written in a hurry two years from now, which makes absence the strongest enforcement available. It is also the easiest to undo accidentally, which is why each is written down here as a rule rather than left as an observation about the schema.
