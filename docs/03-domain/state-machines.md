# State Machines

> **Status:** Written
> **Owner step:** Step 2 — Domain Model
> **Last updated:** 2026-08-20
> **Depends on:** [entities.md](entities.md), [occupancy-model.md](occupancy-model.md), [rental-lifecycle.md](../00-overview/rental-lifecycle.md)
> **Informs:** [04-api](../04-api/) operations, [05-database](../05-database/) constraints, [10-testing](../10-testing/)

Every lifecycle in the domain, with its legal transitions and what triggers them. Where an illegal transition is non-obvious, it is listed explicitly — those are the ones that get built by accident.

**Convention:** states are `UPPER_SNAKE`. A transition is `FROM ──trigger──▶ TO`. Terminal states are marked ∎.

---

## Organization

```
  DRAFT ──owner completes profile──▶ PENDING_VERIFICATION
                                            │
                        ┌───────────────────┼───────────────────┐
                        │ admin approves    │ admin rejects     │ admin requests info
                        ▼                   ▼                   ▼
                    VERIFIED           REJECTED ──resubmit──▶ PENDING_VERIFICATION
                        │                                          ▲
                        │ admin suspends                           │
                        ▼                                          │
                    SUSPENDED ──────reinstated───────▶ VERIFIED    │
```

| Rule | |
|---|---|
| `DRAFT` and `PENDING_VERIFICATION` can do everything except publish | D-10, D-11 |
| Only `VERIFIED` may publish a listing | D-11 |
| `SUSPENDED` freezes publishing and new commitments; **existing leases, invoices, and stays continue** | Suspending an Organization must not evict its tenants |

**Illegal:** `DRAFT ──▶ VERIFIED` without review. Verification is always a decision by a named Platform Admin, recorded with a reason.

---

## Listing

**This machine answers [U-03](../00-overview/product-decisions.md#resolved-by-step-2).**

```
   DRAFT ──submit──▶ PENDING_APPROVAL ──admin approves──▶ APPROVED
     ▲                     │                                 │
     │                     │ admin rejects (with reason)      │ publish
     │                     ▼                                 ▼
     └──────────────── REJECTED                          PUBLISHED
                                                             │ ▲
                                             unpublish ──────┘ │
                                                    │          │ republish
                                                    ▼          │
                                               UNPUBLISHED ────┘
                                                    │
                                                    │ resource archived
                                                    ▼
                                                 ARCHIVED ∎
```

### Who may act

| Transition | Owner | Property Manager | Platform Admin |
|---|---|---|---|
| `DRAFT ──▶ PENDING_APPROVAL` | Yes | **Yes** — always | No |
| `PENDING_APPROVAL ──▶ APPROVED / REJECTED` | No | No | **Yes, only** |
| `APPROVED ──▶ PUBLISHED` | Yes | **Only if the Organization grants publish delegation** | No |
| `PUBLISHED ──▶ UNPUBLISHED` | Yes | Yes — always | Yes (moderation) |

> **U-03 resolved:** a Property Manager may always *prepare and submit*, and may *publish* only when the Owner has turned on publish delegation for the Organization — off by default. Unpublishing is always available to a Manager, because taking a wrong listing down is never the risky direction.
>
> Every submission and every publication records the acting User. The approval chain is therefore always answerable to "who put this in front of the public", regardless of how delegation is set.

### Rules

- **Re-approval on material change.** Editing price, resource, or listing kind on a `PUBLISHED` listing returns it to `PENDING_APPROVAL`. Editing photos or description text does not. Which fields are material is fixed here, not left to the UI.
- A listing may not reach `PUBLISHED` unless its Organization is `VERIFIED` (D-11) and its resource is `ACTIVE`.
- Publishing does **not** consult availability. A published listing for a fully occupied resource is legal and shows "no availability" — the projection tells the truth ([occupancy-model.md](occupancy-model.md#the-two-projections)).

**Illegal:** `DRAFT ──▶ PUBLISHED`. There is no path that skips approval, for anyone, including Platform Admins (D-12).

---

## Application — long-term only

```
  SUBMITTED ──owner/manager reviews──┬──approve──▶ APPROVED
      │                              │                │
      │ customer withdraws           └──reject───▶ REJECTED ∎
      ▼                                                │
  WITHDRAWN ∎                                          │ hold placed on approval
                                                       │ (72h default)
                            ┌──────────────────────────┤
                            │                          │
              initial payment received        hold expires / payment fails
                            │                          │
                            ▼                          ▼
                      LEASE_CREATED ∎              EXPIRED ∎
```

| Rule | |
|---|---|
| Approval places a `HELD` occupancy for the proposed term | [occupancy-model.md](occupancy-model.md#held-versus-committed) |
| **Approval may be refused by the timeline** — if the proposed term overlaps a committed occupancy, approval fails with the conflict | This is the U-01 payoff |
| Several applications may be `SUBMITTED` for one resource simultaneously | An application is not a hold |
| Approving a second application whose term overlaps an approved one fails | The first approval's hold blocks it |
| `EXPIRED` is not `REJECTED` | The owner said yes; the customer did not pay. Different fact, different notification, and re-applying is allowed |

---

## Lease

```
   PENDING_ACTIVATION ──advance + deposit received──▶ ACTIVE
          │                                             │
          │ payment never arrives                       │
          ▼                                    ┌────────┼───────────┐
       VOID ∎                                  │        │           │
                                     renewal   │        │           │ notice given
                                     agreed    │        │           ▼
                                               │        │      NOTICE_GIVEN
                                               ▼        │           │
                                          RENEWED ──────┘           │ end date reached
                                        (new term,                  ▼
                                       same lease id)          ENDING
                                                                    │ move-out inspection
                                                                    ▼
                                                            PENDING_SETTLEMENT
                                                                    │ deposit settled
                                                                    ▼
                                                                 CLOSED ∎
```

| Rule | |
|---|---|
| A lease becomes `ACTIVE` only when advance and deposit are received in full | [rental-lifecycle.md](../00-overview/rental-lifecycle.md#path-a--long-term-lease) |
| Activation converts the held occupancy to `COMMITTED` and grants `TENANT` capability | Same account, additive (D-15) |
| Recurring invoices are generated only while `ACTIVE` or `NOTICE_GIVEN` | |
| `CLOSED` requires the Deposit Balance to be fully settled | [I-05](invariants.md#i-05--a-lease-cannot-close-with-an-unsettled-deposit) |
| Reaching the end date does **not** auto-close a lease | Holdover happens constantly in PH rentals; an open-ended occupancy plus `ENDING` is honest about it |
| The `TENANT` capability lapses at `CLOSED`, not at `ENDING` | A tenant mid-move-out still needs to see their balance |

**Illegal:** `ACTIVE ──▶ CLOSED` directly. Every lease ends through settlement, even a settlement of ₱0.

---

## Booking

```
   PENDING_PAYMENT ──payment succeeds──▶ CONFIRMED ──check-in date──▶ (Stay)
        │                                    │
        │ hold expires (60 min)              │ guest or owner cancels
        │ or payment fails                   ▼
        ▼                                CANCELLED ──refund per policy──▶ ∎
     EXPIRED ∎
```

## Stay

```
   UPCOMING ──guest checks in──▶ IN_PROGRESS ──guest checks out──▶ COMPLETED ∎
       │                              │
       │ guest never arrives          │ ended early
       ▼                              ▼
    NO_SHOW ∎                    CUT_SHORT ∎
```

| Rule | |
|---|---|
| Creating a booking places a `HELD` occupancy immediately | Unlike an application |
| `CONFIRMED` converts the hold to `COMMITTED` and grants the `GUEST` capability | |
| Checkout closes the occupancy and **lapses** the `GUEST` capability | [U-04](entities.md#guest) — the Stay persists as history; the relationship does not |
| `NO_SHOW` and `CUT_SHORT` close the occupancy on the actual date | Nights are released back to inventory |
| Cancellation refunds follow the listing's stated policy | No dynamic or discretionary refunds in V1 |

**Illegal:** any transition from a Stay into an Application or Lease. There is no such edge (D-06).

---

## Occupancy

The smallest machine in the domain, and the one everything else leans on.

```
    HELD ──cause commits──▶ COMMITTED ──cause ends──▶ CLOSED ∎
      │                          │
      │ expires / cancelled      │ cancelled, terminated, no-show
      ▼                          ▼
   RELEASED ∎                RELEASED ∎
```

| Rule | |
|---|---|
| `HELD` and `COMMITTED` both block overlapping intervals | [I-01](invariants.md#i-01--no-overlapping-committed-occupancy) |
| `RELEASED` and `CLOSED` block nothing | |
| A `HELD` interval past its `expires_at` is treated as `RELEASED` on read | Correctness must not depend on a sweeper having run |
| `CLOSED` may set `ends_on` earlier than planned | Early termination, cut-short stay |
| Extending `ends_on` is a new overlap check, not an edit | Extending into someone else's booking must fail |

---

## Invoice

```
   DRAFT ──issue──▶ ISSUED ──due date passes──▶ OVERDUE
                      │                            │
       partial payment│                            │ partial payment
                      ▼                            ▼
              PARTIALLY_PAID ◀────────────────────┘
                      │
                      │ balance reaches zero
                      ▼
                    PAID ∎        VOIDED ∎  (issued in error; a new
                                            entry, never a deletion)
```

`OVERDUE` is derived from the due date, not a stored transition someone has to remember to run. `VOIDED` writes an opposing ledger entry — the original invoice is never removed (D-08).

## Payment

```
   ONLINE:    INITIATED ──▶ PROCESSING ──┬── succeeded ──▶ SETTLED ∎
                                         └── failed ─────▶ FAILED ∎
                                                              │ partial or full
                                                              ▼
                                                          REFUNDED ∎

   OFFLINE:   RECORDED ∎        ← staff attest cash changed hands.
                                  No processing states, because the
                                  platform processed nothing (D-09).
```

The two shapes are visibly different **on purpose**. An offline recording has no `PROCESSING` state to fake, and no provider reference to display. A report that renders them identically is a bug ([payments-overview.md](../00-overview/payments-overview.md), [product-scope.md](../00-overview/product-scope.md#risk-4--the-offline-payment-path-is-a-trust-surface)).

Correcting a mistaken offline recording is a **new opposing entry**, never an edit. `RECORDED` is terminal.

## Deposit Balance

```
   HELD ──move-out inspection──▶ PENDING_SETTLEMENT
                                        │
                     ┌──────────────────┼──────────────────┐
                     ▼                  ▼                  ▼
              FULLY_RETURNED    PARTIALLY_APPLIED    FULLY_APPLIED
                     │                  │                  │
                     └──────────────────┴──────────────────┘
                                        ▼
                                    SETTLED ∎
```

Every application against the deposit references an inspection finding or an outstanding invoice. Deductions with no cited cause are not expressible — see [money-model.md](money-model.md#deposit-as-a-held-balance).

---

## Maintenance Request

```
   REPORTED ──staff triages──▶ ACKNOWLEDGED ──assign──▶ IN_PROGRESS
       │                            │                       │
       │ duplicate / not an issue   │                       ▼
       ▼                            │                   RESOLVED
    REJECTED ∎ ◀───────────────────┘                       │
                                                  reporter confirms
                                                  or 7 days pass
                                                           ▼
                                                        CLOSED ∎
```

Reportable by anyone with an active occupancy — tenant **or** guest — and by staff with no occupancy at all ([U-05](entities.md#maintenance-request)). The state machine is identical for both; only the downstream obligation differs.

---

## Virtual Tour

```
   DRAFT ──scenes uploaded──▶ PROCESSING ──derivatives ready──▶ READY
                                   │                              │
                                   │ processing fails             │ publish
                                   ▼                              ▼
                                FAILED                        PUBLISHED
                                                                  │
                                                        unpublish │
                                                                  ▼
                                                             UNPUBLISHED
```

A tour cannot reach `READY` while any scene is still processing, and cannot reach `PUBLISHED` with a navigation hotspot pointing at a missing scene ([I-07](invariants.md#i-07--tour-navigation-is-total)). Both rules exist because a broken tour on a published listing is worse than no tour.

---

## Transitions that do not exist

Worth naming, because each is a shortcut somebody will eventually propose:

| Proposed | Why there is no edge |
|---|---|
| Stay ──▶ Lease ("convert a long staying guest") | D-06. The guest applies like anyone else |
| Listing `DRAFT` ──▶ `PUBLISHED` | D-12. No actor may skip approval |
| Lease `ACTIVE` ──▶ `CLOSED` | Settlement is mandatory, even at ₱0 |
| Payment `RECORDED` ──▶ edited | D-09. Corrections are new opposing entries |
| Occupancy ──▶ deleted | Freeing dates is `RELEASED`; history is never removed |
| Capability ──▶ replaced | D-15. Capabilities are added and revoked, never swapped |
