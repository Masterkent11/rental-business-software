# Rental Lifecycle

> **Status:** Written
> **Owner step:** Step 1 — Product Definition
> **Last updated:** 2026-08-18
> **Depends on:** [glossary.md](glossary.md), [product-decisions.md](product-decisions.md)
> **Informs:** [03-domain](../03-domain/) state machines, every journey document

There are **two** rental lifecycles, and they diverge permanently after the customer picks a listing. They share everything upstream of that point and nothing downstream of it.

The most common way to get this wrong is to treat short-term as a special case of long-term. It is not. A guest staying two nights has no application, no lease, and is not a Tenant. Forcing `Application → Lease → Tenant` onto a weekend booking produces a model that lies about what happened.

---

## Shared upstream — inventory becomes discoverable

Identical for both paths.

```
Owner signs up
      │
      ▼
Organization created
      │
      ▼
Platform verification ─────── unverified: can build, cannot publish
      │
      ▼
Property created            (ABC Apartment, 12 Mabini St.)
      │
      ▼
Buildings / Floors          (optional structure)
      │
      ▼
Rentable Resources created  (Unit 203 · Bed A · Parking Slot 12)
      │                      each configured with a Rental Mode
      ▼
Media + Interactive Virtual Tour authored
      │                      360 scenes, hotspots, labels
      ▼
Listing created             (marketplace representation + price)
      │
      ▼
Submitted for approval
      │
      ▼
Platform Admin approves ──── rejected: back to owner with reason
      │
      ▼
PUBLISHED
      │
      ▼
Customer discovery          search · filter · compare
      │
      ▼
Listing detail              photos
      │
      ▼
INTERACTIVE VIRTUAL TOUR    living room → kitchen → bedroom
      │                      image / video / info hotspots
      ▼
      ├──────────────────────┬──────────────────────┐
      ▼                      ▼
  LONG-TERM              SHORT-TERM
  (see below)            (see below)
```

Two gates sit in this upstream, and they are different things (see [glossary.md](glossary.md#approval)):

| Gate | Decided by | Blocks |
|---|---|---|
| Organization verification | Platform Admin | Publishing anything at all |
| Listing approval | Platform Admin | That specific listing going public |

---

## Path A — Long-term lease

For monthly residential rentals: units, rooms, bed spaces, parking, storage.

```
Listing (long-term)
      │
      ▼
Enquiry / Viewing request        optional
      │
      ▼
APPLICATION                      customer submits, attaches documents
      │
      ▼
Owner / Manager review
      │
      ├── Rejected ──▶ customer notified, resource stays available
      │
      ▼
APPROVED
      │
      ▼
Initial PAYMENT                  advance + deposit
      │                          ₱8,500 advance + ₱17,000 deposit
      ▼
LEASE created                    12 months from Sept 1, ₱8,500/month
      │
      ▼
TENANT                           customer now also holds tenant capabilities
      │                          same account — nothing re-registered
      ▼
Move-in
      │
      ▼
┌─────────── recurring cycle ───────────┐
│                                       │
│   RECURRING INVOICE raised            │  INV-2026-09-0142, due Sept 5
│           │                           │
│           ▼                           │
│   RENT PAYMENT                        │  online  or  staff-recorded cash
│           │                           │
│           ▼                           │
│   Ledger + receipt                    │
│                                       │
│   MAINTENANCE REQUESTS (any time)     │
│           │                           │
│           ▼                           │
│   Staff assign → resolve → close      │
│                                       │
└───────────────┬───────────────────────┘
                │
                ▼
        Approaching lease end
                │
      ┌─────────┴─────────┐
      ▼                   ▼
   RENEWAL            TERMINATION
      │                   │
      │                   ▼
      │            Move-out inspection
      │                   │
      │                   ▼
      │            Deposit settlement       returned, or applied to
      │                   │                 damages / arrears
      │                   ▼
      │            Resource becomes vacant
      │                   │
      │                   ▼
      │            Listing re-published
      │
      └──▶ new lease term, cycle continues
```

**Key properties of this path:**

- The customer is screened *before* commitment — application then approval.
- Money is **recurring**: an invoice is raised each period, and payment chases it.
- Occupancy is open-ended within the lease term; there is no checkout date in the booking sense.
- Ends deliberately, with a settlement step for the deposit.

---

## Path B — Short-term stay

For nightly rentals. **No application. No lease. No tenant.**

```
Listing (short-term)
      │
      ▼
SELECT DATES                     Dec 26 → Dec 29
      │
      ▼
AVAILABILITY CHECK               are those nights open?
      │
      ├── Unavailable ──▶ suggest alternative dates
      │
      ▼
BOOKING                          3 nights × ₱1,500 = ₱4,500
      │
      ▼
PAYMENT                          prepaid, in full
      │
      ├── Failed / expired ──▶ dates released back to inventory
      │
      ▼
RESERVATION CONFIRMED            dates blocked, guest notified
      │
      ▼
Check-in                         Dec 26
      │
      ▼
STAY                             occupancy, no lease
      │
      ▼
Check-out                        Dec 29
      │
      ▼
COMPLETED                        dates released, resource bookable again
```

**Key properties of this path:**

- No screening step — payment *is* the commitment.
- Money is **prepaid and one-off**: no recurring invoice, no chasing.
- Occupancy is bounded by dates from the moment of booking.
- Ends by simply finishing. There is no termination event and no deposit settlement in V1.
- The guest does **not** become a Tenant, and no lease exists. Whether any relationship persists after checkout is [U-04](product-decisions.md#unresolved).

---

## The two paths side by side

| | Long-term | Short-term |
|---|---|---|
| Screening | Application → approval | None; payment commits |
| Agreement artifact | Lease | Booking → Stay |
| Occupant becomes | **Tenant** | Guest — never a Tenant |
| Money shape | Recurring invoices, chased | Prepaid once, in full |
| Initial money | Advance + deposit | Full stay amount |
| Availability model | Occupancy state (vacant/occupied/reserved) | Date-range calendar |
| Pricing | Monthly rent | Nightly rate |
| Duration | Open within lease term | Fixed check-in/check-out |
| Ends by | Renewal or termination + deposit settlement | Checkout |
| Maintenance | Yes, tenant-reported | [U-05](product-decisions.md#unresolved) |
| Cancellation | Lease termination, notice periods | Booking cancellation, refund rules |

## Where the divergence costs us

Both paths run over the **same Rentable Resource**. That is what makes this powerful — *Condo Unit 101* can be worth ₱15,000/month or ₱1,500/night — and also what makes it the largest scope multiplier in V1 (D-06).

The unavoidable consequences:

- **Availability must speak two languages** for one resource: an occupancy state and a date calendar.
- **Pricing must speak two languages**: a monthly rent and a nightly rate.
- **The money model must handle both** a prepaid one-off and a recurring claim, in one ledger.

And the question that determines how hard all of this is remains deliberately open:

> **[U-01](product-decisions.md#unresolved) — May one resource participate in long-term and short-term availability *simultaneously*?**
>
> If **yes**, availability must reconcile both models on one resource and guarantee a nightly booking can never land inside an active lease. If **no**, `HYBRID` simply means the resource can be switched between modes, and each mode owns the calendar while active.
>
> This is Step 2's decision. **It must not be settled by an implementation detail.**

## Cross-cutting: state that flows back to the marketplace

Both paths feed the same fact back upstream, and this is the closure the whole product depends on:

```
Lease signed  ──┐
                ├──▶ Resource no longer available ──▶ Listing reflects it
Stay booked   ──┘

Lease ended   ──┐
                ├──▶ Resource available again    ──▶ Listing re-published
Stay completed──┘
```

A published listing whose resource is occupied is a bug, not a stale cache. Keeping this true automatically is a core requirement of the platform, not a nicety.
