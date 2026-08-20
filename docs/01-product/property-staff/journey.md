# Property Manager & Staff Journey

> **Status:** Written
> **Owner step:** Step 1 — Product Definition
> **Last updated:** 2026-08-18
> **Depends on:** [personas.md](../../00-overview/personas.md), [payments-overview.md](../../00-overview/payments-overview.md)
> **Informs:** owner web and owner mobile scope, [roles-and-permissions.md](../roles-and-permissions.md)

**Actors:** Property Manager (broad delegated authority) and Staff (narrow operational access). Both work *for* an Organization; neither owns it.
**Primary surfaces:** Property Manager — owner web, plus owner mobile. Staff — owner mobile, a deliberately narrow slice.

These are two distinct roles sharing one document because they sit on one spectrum of delegated authority. Where that authority stops, relative to the Owner, is the point of this document.

---

## The authority spectrum

```
OWNER ──────────── PROPERTY MANAGER ──────────── STAFF
  │                        │                       │
  Owns the business        Runs the business       Does today's job
  Financial authority      Operational authority   Task authority
  Organization settings    Assigned properties     Assigned resources
  Staff management         Applications, leases    Cash, maintenance
  Refunds, waivers         Invoices, payments      Occupancy status
```

The dividing line is simple and deliberate: **operating the business is delegated; owning it is not.** A manager can fill a building, sign tenants, and collect rent. Only the Owner gives money back, changes the Organization, or decides who else gets access.

---

## Property Manager

> **Grace, 41.** Manages Mr. Santos's boarding house full-time. Handles viewings, screens applicants, chases rent, coordinates repairs. Makes most day-to-day decisions without asking.

### What she does

| Area | Authority |
|---|---|
| Properties and resources | Create and edit, for assigned properties |
| Media and virtual tours | Author and edit |
| Listings | Create, edit, submit for approval — publish authority pending [U-03](../../00-overview/product-decisions.md#unresolved) |
| Availability and pricing | Manage |
| Applications | Review, approve, reject |
| Bookings | Manage, cancel per policy |
| Leases | Issue, renew, terminate |
| Invoices | Raise and track |
| Payments | **Record offline payments** |
| Maintenance | Assign, track, resolve |
| Tenants | Communicate in rental context |
| Reports | View for assigned properties |

### Where her authority stops

| Cannot | Why |
|---|---|
| Issue refunds | Financial authority is the Owner's — money out is not money in |
| Waive invoices | Same |
| Settle deposits | Same |
| Manage staff or widen her own access | Access is the Owner's to grant |
| Change Organization settings | She operates the business; she does not own it |
| Act on properties not assigned to her | Scope of delegation |

**The unresolved question:** whether a manager may publish a listing without owner sign-off — [U-03](../../00-overview/product-decisions.md#unresolved). It affects approval chains and audit trails, and belongs to Step 2. The UI must not imply either answer yet.

### Her hardest workflow: turnover

The boarding house turns over 40 bed spaces each semester. Today that is done by text message.

```
Semester ending
   │
   ▼
Leases expiring in bulk      40 beds, overlapping dates
   │
   ▼
Renewals vs move-outs        who is staying?
   │
   ▼
Move-out inspections + deposit settlements    (settlement → Owner)
   │
   ▼
Re-list vacated beds         listings back to public
   │
   ▼
Application wave             many applicants, few beds
   │
   ▼
Approve, lease, collect advance + deposit
```

**What this demands of V1:** bulk visibility of expiring leases, fast re-listing of a vacated resource, and application review that works on a phone. Handling this one bed at a time through single-item screens would be slower than the text messages it replaces — the product would lose to the status quo.

---

## Staff

> **Marco, 33, live-in caretaker.** On site daily. Receives cash rent, lets in technicians, spots the leaking faucet before anyone reports it. Basic Android phone.

### What he does

Three things, mostly:

```
1. Record cash he was handed
2. Log and update maintenance
3. Update occupancy status
```

| Area | Authority |
|---|---|
| Assigned resources | View |
| Offline payments | **Record** |
| Maintenance | Create, update, resolve |
| Occupancy status | Update (e.g. mark under maintenance) |
| Tenants | See contact details for assigned resources only |

### Where his authority stops

| Cannot | Why |
|---|---|
| Approve applications | Not a letting decision |
| Create or terminate leases | Not a contractual authority |
| Raise, edit, or waive invoices | Not a billing authority |
| Issue refunds | Financial authority |
| Create or publish listings | Not a marketplace authority |
| See financial reports | Beyond his job |
| See resources not assigned to him | Scope |

### Recording an offline payment — the critical workflow

**The single most important thing Staff do**, and the one most at risk of being bypassed.

```
Tenant hands over ₱8,500 cash
        │
        ▼
Marco opens the app
        │
        ▼
Finds the tenant / invoice
        │
        ▼
Records: amount · date · method (cash) · reference
        │
        ▼
LEDGER  ─── tagged as offline recording, with Marco's name and timestamp
        │
        ▼
Receipt issued to tenant
```

**Design constraints this places on V1:**

| Constraint | Why |
|---|---|
| A few taps, start to finish | If it takes longer than writing in a notebook, he uses the notebook, and the ledger becomes fiction |
| Works on a basic Android phone | That is the actual device |
| Tolerates poor connectivity | He is in a corridor, not an office |
| Cannot be done by the tenant | A person cannot attest to their own cash |
| Records who and when, always | It is an attestation, and attestations need an attester |

### What recording is, and what it is not

> **Marco recording a payment does not mean the platform processed the money** (D-09).

He is **attesting** that cash changed hands. The platform moved nothing and cannot independently verify it ([payments-overview.md](../../00-overview/payments-overview.md#the-one-distinction-that-must-survive)).

This is why every offline entry carries his name and the time, why the ledger is append-only, and why corrections are new entries referencing the original rather than edits. Marco is **trusted to attest and audited on it** — the two halves are inseparable, and neither is an accusation. It is what makes trusting him safe for everyone, including him.

### Maintenance

| | |
|---|---|
| **Does** | Logs issues he spots; receives assigned requests; updates status; adds photos; marks resolved |
| **Needs** | Speed, again. Logging a leak should take seconds |

He is often the first to know, before any tenant reports it.

---

## Manager and Staff compared

| | Property Manager | Staff |
|---|---|---|
| Scope | Assigned properties | Assigned resources |
| Applications | Approve / reject | No |
| Leases | Issue, renew, terminate | No |
| Invoices | Raise and track | No |
| Record offline payments | Yes | Yes |
| Refunds, waivers, deposit settlements | **No — Owner only** | No |
| Listings | Create, edit, submit | No |
| Maintenance | Assign and oversee | Execute and update |
| Reports | Assigned properties | No |
| Staff management | No | No |
| Primary surface | Owner web + mobile | Owner mobile only |

---

## What neither may ever do

| Cannot | Why |
|---|---|
| Edit or delete a ledger entry | Append-only; corrections are new entries |
| Issue refunds | Owner-only financial authority |
| Manage staff or change their own access | Owner-only |
| See other Organizations' data | Organization isolation (D-13) |
| Record a payment as though the tenant paid online | Recording ≠ processing (D-09) |
| Act outside their assigned scope | Delegation has boundaries |

---

## States these surfaces must handle

- **Nothing assigned yet.** A newly invited staff member with no properties. Say so; do not show an empty dashboard that looks broken.
- **Poor connectivity while recording cash.** The highest-stakes failure: money received, recording failed. The UI must never leave Marco unsure whether it saved.
- **A payment already recorded.** Guard against double-recording the same cash.
- **Tenant disputes a recorded amount.** Correction is a new ledger entry with a reason — never an edit.
- **Bulk lease expiry.** Semester turnover; single-item screens will not survive it.
- **Maintenance backlog.** Requests aging past acceptable time, visible to the manager before the owner has to ask.
