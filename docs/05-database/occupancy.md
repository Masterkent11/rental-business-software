# Occupancy — as built

> **Status:** Written (Sprint 3)
> **Owner step:** Step 4 — Database
> **Last updated:** 2026-08-22
> **Depends on:** [ADR-0005](../12-adr/0005-occupancy-write-serialization.md), [ADR-0004](../12-adr/0004-availability-projection.md), [I-01](../03-domain/invariants.md#i-01--no-overlapping-committed-occupancy)

[I-01](../03-domain/invariants.md#i-01--no-overlapping-committed-occupancy) is the invariant the platform exists to keep. This is how it is kept.

## The tree becomes a range

ADR-0005's first mechanism is "a materialized ancestor path, so the tree
question becomes a range question". Concretely: every resource carries a
**pre-order interval**.

```
   Room 101   subtree = [1,3)     ← the whole tree
   └ Bed A    subtree = [2,3)     ← contained by its parent's
```

Each node gets `[pre, pre + subtree_size - 1]` in depth-first order. An
ancestor's interval **contains** every descendant's; siblings are disjoint.

Ancestry therefore becomes `&&`. That matters for one specific reason: `@>`
("contains") is not commutative, and **an `EXCLUDE` constraint requires a
commutative operator**. Overlap is commutative, so the tree rule fits inside a
constraint the database can enforce by itself.

`rebuild_resource_paths()` recomputes every tree. It is called after a resource
is added, moved, or removed — recomputed wholesale rather than maintained
incrementally, because a wrong interval would silently stop the constraint from
seeing a conflict, and that is not a failure worth optimising towards.

## The constraint

```sql
constraint occupancy_no_overlap exclude using gist (
  root_id  with =,
  subtree  with &&,
  during   with &&
) where (state in ('HELD','COMMITTED'))
```

**This is the actual guarantee.** Not a convention the application agrees to
follow: a future service, a migration, or somebody at a psql prompt is bound by
it too.

- `root_id with =` scopes the comparison to one tree. Intervals are only
  meaningful within the tree that numbered them — without this, two
  organizations' `[1,3)` would collide.
- `where (state in ...)` means cancelled, released, and expired rows stop
  occupying while staying on the timeline.

Requires `btree_gist`, because `uuid =` is a btree operator being mixed with
GiST range operators.

### Half-open dates, throughout

`[starts_on, ends_on)`. A guest checking out on the 10th and another checking in
on the 10th do not collide. That is the ordinary case, not an edge case, which
is why the convention is fixed rather than decided per query.

## Writes serialize on the root

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT pg_advisory_xact_lock(hashtext(:root_id));
-- sweep expired holds on this tree
-- insert the occupancy        ← EXCLUDE is the backstop
-- update the projection
COMMIT;
```

The lock is on the **root**, not the resource. A lease on the unit and a booking
on a bed inside it must contend on the same lock, or the nesting rule goes
unenforced exactly when it matters.

### Expired holds are swept inside the transaction

The constraint's predicate must be immutable, so it cannot ask whether a hold
has expired. An abandoned checkout would therefore block those nights forever.
The sweep runs inside the critical section, before the insert.

Expiry is **also** evaluated on read, so a night never shows as taken between
the hold lapsing and the next sweep touching that tree.

## Two failures, kept apart

| Postgres | Domain | HTTP | Means |
|---|---|---|---|
| `23P01` exclusion_violation | `OccupancyConflictError` | **409** | Those nights are gone. Final |
| `40001` / `40P01` | `SerializationError` | **503** | An accident of timing. Retryable |

Collapsing these would have a client retrying a booking that can never succeed,
or giving up on one that would have worked. The use case retries serialization
failures up to three times with growing backoff and **never** retries a
conflict — the customer has to be told at request time.

## Only published inventory is bookable

`placeHold` joins to a `PUBLISHED`, `SHORT_TERM` listing before doing anything
else, and returns **404** when there is none. Without that check, a booking
attempt is a way to reserve — and to discover — inventory nobody has published.

Absent, not forbidden, consistent with every other unpublished read (D-12).

## RLS

| Policy | Rule |
|---|---|
| `org_isolation` | Row belongs to the scoped organization |
| `occupancy_public_read` | Some resource on the same ancestor path backs a published listing |

The public policy exists because a booking calendar's whole job is revealing
which nights are taken. It is scoped to the ancestor path so a customer asking
about a bunk sees the lease on the room above it.

**A caution learned here:** `org_isolation` is a `USING` clause, so it filters
**writes as well as reads**. An unscoped `UPDATE` matches zero rows and reports
success. That is the same quiet failure [P-03](../02-architecture/architecture-principles.md#p-03--isolation-is-enforced-twice-independently) names, and it cost a debugging round.

## The projection

`resource_night_status` is updated in the same transaction as the timeline
(ADR-0004), so it is never stale within a request.

**It is not yet read.** The calendar endpoint computes from `occupancies`
directly — one indexed range query for a single resource over a bounded window,
which is cheap and cannot disagree with the truth. The projection is there for
the search page, where a status is needed per card and recomputation would not
survive. When search uses it, the rule stays as ADR-0004 wrote it: if the
projection disagrees with the timeline, **the timeline is right**.

## What is not built

- **Committing a hold.** Holds expire; nothing promotes one to `COMMITTED` yet.
  That is Sprint 4, with payment.
- **Leases.** `kind = 'LEASE'` rows are written directly in tests. The
  application path arrives with applications in Sprint 4.
- **Owner blocks.** `kind = 'BLOCK'` exists in the schema and has no writer.
- **A background expiry sweeper.** Expiry is handled lazily, on write to the
  same tree and on read. A hold on a quiet property stays `HELD` in the table
  until someone looks, which is correct but means the table over-reports until
  swept.
