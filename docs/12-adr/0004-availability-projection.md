# ADR-0004 — Availability projections as materialized tables

**Status:** Accepted · **Date:** 2026-08-20 · **Deciders:** Step 3
**Named by:** Step 2, [occupancy-model.md](../03-domain/occupancy-model.md#consequence-for-reads)

## Context

Step 2 decided one occupancy timeline per resource, with the long-term occupancy state and the short-term nightly calendar as **read projections** of it (U-01). It then handed Step 3 an explicit warning: computing those projections from raw intervals on every request will not survive a marketplace search page.

Search hits them on every card. Listing detail hits them. Owner dashboards hit them. Booking calendars hit them for a date range across a whole month.

Step 2 fixed one thing and left the rest open: **the cache is a cache.** If it disagrees with the intervals, the intervals are right.

## Decision

**Materialized projection tables in the same database**, updated in the same transaction as the occupancy write, with a rebuild command that recomputes from the timeline.

| Projection | Grain | Serves |
|---|---|---|
| `resource_availability_state` | One row per resource | Long-term state as-of today: `VACANT` / `RESERVED` / `OCCUPIED` / `UNAVAILABLE` |
| `resource_night_status` | One row per resource per night, rolling 18 months | Nightly calendar: `OPEN` / `HELD` / `BOOKED` / `LEASED` / `BLOCKED` |

Both carry `organization_id` and are subject to the same RLS policies as everything else.

Not Postgres `MATERIALIZED VIEW`: those refresh wholesale, and this needs incremental updates on write.

## Consequences

**Good**

- Search and calendar reads are indexed lookups.
- Updated in the same transaction as the timeline, so they are never stale within a request.
- A rebuild command exists and is cheap enough to run, which is what makes [P-05](../02-architecture/architecture-principles.md#p-05--derived-data-is-derived-and-says-so) real rather than aspirational.
- Held expiry is still evaluated on read at query time, so an expired hold never shows as taken even if the projection has not been touched.

**Bad, accepted**

- Occupancy writes get more expensive: one interval insert becomes an insert plus a bounded range update. On the contended path ([ADR-0005](0005-occupancy-write-serialization.md)) this lengthens the critical section.
- The nightly table is large: 50 resources × 550 nights ≈ 27,500 rows at pilot scale, and grows linearly with inventory.
- Two representations of one truth, which is exactly the situation Step 2 warned about — mitigated by the rebuild path and by the rule that the timeline always wins.

## Alternatives

| Rejected | Why |
|---|---|
| **Compute on read from intervals** | Step 2 predicted this fails on the search page, and a range query per card confirms it |
| **`MATERIALIZED VIEW` with periodic refresh** | Wholesale refresh, and a staleness window on the one thing that must never be stale — a published listing whose resource is occupied is a bug, not a cache miss |
| **External cache (Redis)** | A second store to keep consistent, outside the transaction, for a pilot that has neither the volume nor the operational appetite |

## Revisit when

- The nightly table's write cost shows up in booking latency.
- Inventory grows past the point where an 18-month horizon per resource is sensible.
