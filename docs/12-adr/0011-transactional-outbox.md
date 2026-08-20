# ADR-0011 — Domain events via a transactional outbox

**Status:** Accepted · **Date:** 2026-08-20 · **Deciders:** Step 3

## Context

Several things must happen after a state change: notifications, projection updates, search indexing. The tenant journey sets the bar — *"a tenant should never be chased for something they were not told about"* — so notification delivery is a product requirement, not a nicety.

The naive approach sends the notification inside the transaction, which produces messages for work that then rolls back. The other naive approach sends after commit without a record, which loses events when the process dies between the two.

## Decision

**A transactional outbox.** Events are rows written **in the same transaction** as the state change, and a dispatcher delivers them after commit.

Delivery is **at least once**; consumers are idempotent by event id. No broker in V1 — the outbox table is the queue.

Events: `occupancy.changed`, `booking.confirmed`, `payment.recorded`, `payment.settled`, `invoice.issued`, `invoice.overdue`, `maintenance.acknowledged`, `listing.approved`.

## Consequences

**Good**

- An event exists if and only if the change committed. No notification for a rolled-back payment, no lost notification for a committed one.
- Slow or failing side effects — a provider outage, a push service down — never lengthen the occupancy critical section ([ADR-0005](0005-occupancy-write-serialization.md)).
- The outbox table is a readable audit of what the system tried to tell people, which is exactly the question asked when a tenant says they were never notified.

**Bad, accepted**

- At-least-once means duplicates, so every consumer must be idempotent — a discipline, enforced by tests.
- The outbox table needs pruning once dispatched.
- Dispatcher downtime delays notifications. They queue rather than vanish, but late is still late.

## Alternatives

| Rejected | Why |
|---|---|
| **Send inside the transaction** | Notifications for work that rolled back, and a side effect that cannot be rolled back |
| **Send after commit, no record** | Loses events on process death between commit and send |
| **Postgres `LISTEN`/`NOTIFY`** | Not durable; a disconnected listener misses events entirely |
| **A real broker (SQS, Rabbit)** | Operational surface a five-Organization pilot does not need, and one more thing to keep consistent with the database |

## Revisit when

Outbox volume or dispatch latency justifies a broker — at which point the outbox becomes its source and consumers do not change.
