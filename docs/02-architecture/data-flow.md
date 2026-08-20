# Data Flow

> **Status:** Written
> **Owner step:** Step 3 — Architecture
> **Last updated:** 2026-08-20
> **Depends on:** [hexagonal-architecture.md](hexagonal-architecture.md), [occupancy-model.md](../03-domain/occupancy-model.md)
> **Informs:** [04-api](../04-api/), [05-database](../05-database/), [10-testing](../10-testing/)

How a request moves through the system, and the two paths that carry the most risk.

---

## The general shape

```
   client
     │  HTTPS, bearer token, X-Organization-Id
     ▼
   transport adapter        validate payload · build AuthContext
     │
     ▼
   authorize               capability · scope · ownership
     │
     ▼
   use case                open transaction (UnitOfWork)
     │
     ├──▶ load aggregate via repository
     ├──▶ call domain — it decides, or refuses
     ├──▶ persist
     ├──▶ append ledger / audit entries
     └──▶ write outbox rows
     │
     ▼
   commit                  everything above, or nothing
     │
     ▼
   outbox dispatcher       after commit: notifications, projections
     │
     ▼
   response                typed result, problem+json on failure
```

**Nothing is emitted before commit.** A notification for a payment that rolled back is worse than a late notification, and a projection updated ahead of its source is [P-05](architecture-principles.md#p-05--derived-data-is-derived-and-says-so) violated.

---

## Path 1 — a nightly booking (the contended write)

The path where the product's central invariant is at stake.

```
   POST /bookings  { resourceId, checkIn, checkOut }
     │
     ▼
   authorize: any authenticated customer
     │
     ▼
   BEGIN ISOLATION LEVEL SERIALIZABLE
     │
     ├─ advisory lock on the resource ROOT (the top of the nesting path)
     │     └── two guests booking the same week now queue instead of race
     │
     ├─ load resource + rental mode
     │     └── mode rejects short-term? → 422, no write
     │
     ├─ domain: Occupancy.hold(range, expiresIn: 60min)
     │
     ├─ INSERT occupancy (HELD)
     │     └── EXCLUDE constraint over (resource path, date range) is the
     │         real guarantee. The lock avoids retries; the constraint is
     │         what makes overlap impossible.
     │
     ├─ INSERT booking (PENDING_PAYMENT)
     └─ INSERT outbox: booking.held
   COMMIT
     │
     ▼
   409 with the conflicting dates if the constraint rejected it —
   never a silent "try again"
```

Then payment, out of band:

```
   provider webhook ──▶ verify signature ──▶ idempotency key
     │
     ▼
   BEGIN
     ├─ payment → SETTLED
     ├─ occupancy HELD → COMMITTED, expires_at cleared
     ├─ booking → CONFIRMED, stay created
     ├─ ledger: BOOKING_PREPAID
     └─ outbox: booking.confirmed
   COMMIT
```

**If payment never arrives**, nothing runs: the hold's `expires_at` has passed and every availability query already ignores it ([occupancy-model.md](../03-domain/occupancy-model.md#held-versus-committed)). The sweeper only notifies and tidies. Correctness never waits for a job.

**Webhooks are idempotent by key**, because providers retry and a double-applied payment is a refund conversation.

---

## Path 2 — cash recorded by staff (the trust write)

Simple to build, and the one with the highest cost of being sloppy.

```
   POST /payments/offline  { invoiceId, amount, receivedAt }
     │
     ▼
   authorize: STAFF+ at this Organization, assigned to this property
     │  and never the payer themselves — no such use case exists
     ▼
   BEGIN
     ├─ INSERT payment {
     │     origin: OFFLINE_RECORDED,   ← immutable, I-08
     │     recorded_by: <staff user>,  ← required
     │     received_at: <when cash moved>,
     │     recorded_at: now()          ← when it was entered
     │   }
     ├─ apply to invoice (partial allowed)
     ├─ ledger: PAYMENT_RECEIVED, tagged OFFLINE_RECORDED
     ├─ audit: who recorded what, when
     └─ outbox: payment.recorded → notify the tenant
   COMMIT
```

Three fields do all the work, and all three are written at the moment it happens rather than inferred later ([P-07](architecture-principles.md#p-07--evidence-is-never-inferred)): **who attested**, **when the money moved**, **when it was entered**. The gap between the last two is what the tenant app surfaces so a delay looks ordinary instead of suspicious.

There is no update path. A mistaken recording is corrected by a new opposing entry.

---

## Read paths

```
   marketplace search ──▶ availability projection ──▶ listing rows
   tenant balance     ──▶ query over invoices + payment applications
   owner occupancy    ──▶ availability projection, as-of date
```

Reads never load aggregates ([vertical-slice.md](vertical-slice.md#queries-do-not-go-through-the-domain)). Projections are caches with a rebuild path, and when a projection disagrees with the timeline the timeline wins.

---

## Events

Transactional outbox ([ADR-0011](../12-adr/0011-transactional-outbox.md)): events are rows written inside the same transaction as the state change, dispatched after commit, delivered at least once, consumed idempotently.

| Event | Consumers |
|---|---|
| `occupancy.changed` | Availability projection, listing state |
| `booking.confirmed` | Notification, projection |
| `payment.recorded` · `payment.settled` | Notification, projection |
| `invoice.issued` · `invoice.overdue` | Notification |
| `maintenance.acknowledged` | Notification |
| `listing.approved` | Notification, search index |

No broker in V1. The outbox table is the queue until it demonstrably is not — and with a pilot of five Organizations, it will not be.

---

## Failure behaviour

| Failure | Behaviour |
|---|---|
| Overlap rejected | `409` with the conflicting range. Actionable, not a retry prompt |
| Provider webhook lost | Reconciliation job compares provider settlements against `ONLINE` ledger entries. Offline entries are excluded — they have no provider side ([money-model.md](../03-domain/money-model.md#ledger)) |
| Outbox dispatcher down | Events queue. Nothing is lost; notifications are late |
| Projection stale | Rebuild from the timeline. The timeline is never rebuilt from the projection |
| Storage unavailable | Tours and photos degrade to placeholders; the rest of the product works |

That last row is a product decision as much as a technical one: a listing with a broken image is browsable, and a marketplace that goes down because a CDN did is not one owners will trust.
