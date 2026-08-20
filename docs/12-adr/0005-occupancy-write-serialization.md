# ADR-0005 — Occupancy writes serialize on the resource root

**Status:** Accepted · **Date:** 2026-08-20 · **Deciders:** Step 3
**Named by:** Step 2, [occupancy-model.md](../03-domain/occupancy-model.md#what-this-costs)

## Context

[I-01](../03-domain/invariants.md#i-01--no-overlapping-committed-occupancy) is the invariant the platform exists to keep: no two held or committed occupancies on the same ancestor path may overlap in time.

Step 2 was explicit that a plain read-then-write loses under concurrency, and that two guests booking the same Christmas week is precisely when it matters. It also made the check **tree-shaped**: occupying a resource occupies its whole subtree and every ancestor, so leasing `Unit 203` must block `Room 101` and `Bed A`.

## Decision

**Three mechanisms, in order.** Each is necessary; none is sufficient alone.

1. **A materialized ancestor path** on every rentable resource (`root_id` plus a path), so the tree question becomes a range question.
2. **A Postgres `EXCLUDE` constraint** over `(resource path, date range)` for rows in `HELD` or `COMMITTED`, using `btree_gist`. **This is the actual guarantee.** The database rejects an overlapping write regardless of what application code believes.
3. **A transaction-scoped advisory lock on the resource root**, taken before the read, inside a `SERIALIZABLE` transaction. This makes concurrent bookings queue rather than collide, so the constraint fires rarely instead of constantly.

```
   BEGIN ISOLATION LEVEL SERIALIZABLE;
   SELECT pg_advisory_xact_lock(hashtext(:resource_root_id));
   -- read current occupancy for the path
   -- domain decides
   INSERT INTO occupancies (...);   -- EXCLUDE constraint is the backstop
   COMMIT;
```

Half-open ranges `[starts_on, ends_on)` throughout, matching Step 2 exactly, so a checkout and a check-in on the same day do not collide.

## Consequences

**Good**

- Overlap is impossible by construction, not by convention. A future service, script, or migration writing to this table is still bound by it.
- Locking on the **root** rather than the resource is what makes the nesting rule safe: a lease on the unit and a booking on a bed inside it contend on the same lock.
- Serialization failures are retryable and rare; the lock converts most races into short waits.

**Bad, accepted**

- The critical section is real. It covers the occupancy insert and the projection update ([ADR-0004](0004-availability-projection.md)), and it must stay short — no provider calls, no file writes, no notifications inside it.
- A hot property serializes on its root, so a fifty-bed boarding house is one lock. Acceptable at pilot scale; a known scaling edge.
- `SERIALIZABLE` means the API must handle serialization failures and retry idempotently.
- `btree_gist` is a required extension, and the path must be maintained on every resource move.

## Alternatives

| Rejected | Why |
|---|---|
| **Application-level check only** | Loses under concurrency. Step 2 named this specifically |
| **Optimistic concurrency with a version column** | Detects conflicts on one row; overlap is a conflict across rows in a range |
| **Per-resource lock instead of per-root** | Lets a bed booking and a unit lease proceed concurrently — the exact double-booking the nesting rule exists to prevent |
| **Queue all occupancy writes through one worker** | Serializes the whole product on one consumer, and turns a synchronous refusal into an asynchronous surprise. The customer must be told at request time |

## Revisit when

- Lock contention on a single property shows up in booking latency.
- Inventory reaches a size where root-level locking is too coarse — at which point the path granularity, not the mechanism, changes.
