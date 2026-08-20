# Relationships

> **Status:** Written
> **Owner step:** Step 2 — Domain Model
> **Last updated:** 2026-08-20
> **Depends on:** [entities.md](entities.md), [occupancy-model.md](occupancy-model.md)
> **Informs:** [05-database](../05-database/) schema and foreign keys, [02-architecture](../02-architecture/) aggregate boundaries

How the entities connect, and — more importantly — where the consistency boundaries are.

---

## Aggregate boundaries

An aggregate is a group of entities with one root. **Invariants inside an aggregate hold synchronously; anything crossing a root is eventually consistent.** Getting these lines in the wrong place is how a model becomes either unenforceable or unscalable.

| Aggregate root | Contains | Enforces synchronously |
|---|---|---|
| **User** | Capabilities, credentials | One account per person; capabilities are additive |
| **Organization** | Verification, staff assignments, ledger entries, deposit-balance references | Isolation; append-only ledger |
| **Property** | Buildings, floors | Address integrity |
| **Rentable Resource** | Pricing, **occupancy timeline** | **[I-01](invariants.md#i-01--no-overlapping-committed-occupancy)** — no overlapping occupancy |
| **Listing** | Approval record, published price snapshot | Approval before publish |
| **Virtual Tour** | Scenes, hotspots | Navigation totality |
| **Application** | Attached documents | Decision recorded with a deciding User |
| **Lease** | Tenants, deposit balance, move-out inspection | Deposit arithmetic; lease term integrity |
| **Booking** | Stay, cancellation | Nights match the occupancy interval |
| **Invoice** | Line items, payment applications | Amount paid never exceeds total |
| **Payment** | Refunds | Origin immutability |
| **Maintenance Request** | Photos, assignment, resolution | State progression |

### The one boundary that matters most

**Occupancy belongs to the Rentable Resource, not to the Lease or the Booking.**

```
        WRONG                                RIGHT

  Lease ──owns──▶ occupancy         Resource ──owns──▶ occupancy timeline
  Booking ──owns──▶ dates                          ▲        ▲
                                                   │        │
  Two writers, no shared                     asks  │        │  asks
  boundary, overlap check                          │        │
  is advisory at best.                         Lease     Booking

                                    One writer, one boundary. The resource
                                    may refuse. Overlap is impossible by
                                    construction, not by convention.
```

If a Lease owned its own dates, the only place to check overlap would be *across* aggregates — which is exactly where synchronous guarantees stop existing. Every double-booking bug in this class of software lives in that gap.

---

## The relationship map

```
                            User (platform-scoped)
                              │ 1
                              │
                              │ N
                         Capability ──────────scoped to──────▶ Organization
                                                                   │ 1
      ┌────────────────────────────────────────────────────────────┤
      │                                                            │
      │ N                                                          │ N
   Property ──1:N──▶ Building ──1:N──▶ Floor                   Verification
      │ 1                                  │ 1                Staff Assignment
      │                                    │                  Ledger Entry
      │ N                                  │ N
      └──────────▶ Rentable Resource ◀─────┘
                        │ ▲
              parent 0:1│ │N  (unit → room → bed)
                        └─┘
                          │ 1
        ┌─────────────────┼──────────────────┬────────────────┐
        │ 0:2             │ 1                │ 0:1            │ N
     Listing         OCCUPANCY          Virtual Tour     Maintenance
   (1 long-term,      TIMELINE           │ 1              Request
    1 short-term)         ▲              │ N                 │
        │                 │            Scene ──1:N──▶ Hotspot │
        │            causes│                                  │
        │        ┌────────┴────────┬──────────────┐           │
        │        │                 │              │           │
        │      Lease            Stay        Maintenance       │
        │        ▲                ▲            Block          │
        │        │ 1              │ 1                         │
        │        │                │ 1                         │
   Application ──┘             Booking                        │
        │ N                       │ N                         │
        │                         │                           │
        └────────▶ User ◀─────────┘                           │
                    ▲                                         │
                    └──────────reported by────────────────────┘

   Lease ──1:N──▶ Invoice ──N:M──▶ Payment ──1:N──▶ Refund
   Lease ──1:1──▶ Deposit Balance
   Booking ──1:N──▶ Payment
   Every money event ──▶ Ledger Entry (append-only)
```

---

## Cardinalities that carry a decision

Most relationships are unremarkable. These are not — each encodes something Step 1 or Step 2 decided.

| Relationship | Cardinality | The decision inside it |
|---|---|---|
| User → Capability | 1:N | D-15, D-16. Customer and Tenant coexist; nothing is ever a transition that removes a capability |
| User → Organization | **none** | A User is platform-scoped. The relationship runs through Capability, deliberately |
| Resource → Resource | 0:1 parent, 1:N children | D-04. A bed space is a first-class resource, not an attribute of a room |
| Resource → Listing | **0:2** | A `HYBRID` resource carries at most one long-term and one short-term listing — never a single listing with a mode flag |
| Resource → Occupancy | 1:N | [U-01](occupancy-model.md). One timeline, many intervals, two projections |
| Lease → Occupancy | 1:1 | The lease *has* an occupancy; it does not *own* one |
| Booking → Occupancy | 1:1 | Same, via its Stay |
| Lease → Tenant | 1:N | Co-tenants exist in V1. Rent splitting between them does not (V2) |
| Application → Lease | 0:1 | An approved application that is never paid produces no lease, ever |
| Booking → Stay | 0:1 | A cancelled booking produces no stay |
| Stay → Lease | **none** | D-06. There is no path from short-term to tenancy, and adding one later is re-scoping |
| Lease → Deposit Balance | 1:1 | [U-02](money-model.md#deposit-as-a-held-balance). Held money is a liability of the lease, not a paid invoice |
| Invoice → Payment | N:M | One payment may settle several invoices; one invoice may take several partial payments |
| Maintenance Request → Occupancy | 0:1 | [U-05](entities.md#maintenance-request). Nullable, because staff may report on a vacant resource |
| Anything → Ledger Entry | 1:N, append-only | D-08, D-09. Corrections are new entries |

### The absent relationships are decisions too

Three relationships that a reviewer might expect, and that must **not** exist:

1. **Stay → Lease.** A guest is never a tenant (D-06, [U-04](entities.md#guest)). No foreign key, no nullable column, no "lease_id if long-term".
2. **User → Organization (direct).** Would collapse D-15 immediately — Ana could not be a tenant of one Organization and a guest at another.
3. **Listing → Availability.** A listing never stores whether the resource is free. It reads the projection. A stored copy is a copy that can be wrong, and [rental-lifecycle.md](../00-overview/rental-lifecycle.md#cross-cutting-state-that-flows-back-to-the-marketplace) says a stale listing is a bug, not a cache.

---

## Multi-tenancy: how isolation actually attaches

Every Organization-scoped entity carries `organization_id` **directly**, not by joining up the tree to its Property.

```
   Organization
        │
        ├── Property             organization_id
        │     └── Building       organization_id
        │           └── Floor    organization_id
        │
        ├── Rentable Resource    organization_id   ← not "via property"
        ├── Occupancy            organization_id   ← not "via resource"
        ├── Listing              organization_id
        ├── Lease                organization_id
        ├── Booking              organization_id
        ├── Invoice              organization_id
        └── Payment              organization_id
```

This is denormalized on purpose. Isolation is enforced at the row, so it must be checkable at the row — a policy that has to walk four joins to decide whether you may see something is a policy that will eventually be bypassed by a query someone wrote in a hurry. The redundancy costs an integrity constraint per table; the alternative costs a data breach.

**Users are the exception** and carry no `organization_id`, by design. Access to a User's Organization-scoped data flows through Capability.

How this is enforced technically — row-level security, application-layer scoping, or both — is Step 3's decision ([02-architecture/multi-tenancy.md](../02-architecture/README.md)). This step only fixes *where the boundary attaches*.

---

## Referential rules

| Rule | Applies to |
|---|---|
| **No hard deletes** of business records | Everything below Organization. Archive, never delete — the ledger and audit log must keep referencing them |
| **Ledger and audit entries are immutable** | Ledger Entry, Audit Log Entry. No update path exists |
| **A cause is never orphaned** | Every Occupancy references a live Lease, Stay, or Maintenance Block |
| **Cross-Organization references are forbidden** | Every FK between Organization-scoped entities must stay within one Organization ([I-02](invariants.md#i-02--no-cross-organization-references)) |
| **Media survives its owner** | Archiving a resource does not orphan the assets its ledger receipts may reference |
