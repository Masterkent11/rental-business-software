# Property Owner Journey

> **Status:** Written
> **Owner step:** Step 1 — Product Definition
> **Last updated:** 2026-08-18
> **Depends on:** [personas.md](../../00-overview/personas.md), [rental-lifecycle.md](../../00-overview/rental-lifecycle.md)
> **Informs:** owner web and owner mobile scope, [roles-and-permissions.md](../roles-and-permissions.md)

**Actor:** Property Owner — owns the inventory, carries the risk, is the Organization's principal.
**Primary surface:** Owner web for management; owner mobile for approvals, payments, and maintenance on the go.

An Owner is a **distinct actor from a Tenant** (D-16). They share no journey, no capabilities, and no persona.

---

## The journey

```
Sign up                          self-serve, no gatekeeper
   │
   ▼
Create Organization
   │
   ▼
Submit for verification ──────┐
   │                          │  while pending:
   ▼                          │  CAN build, upload, configure, save
Create Property               │  CANNOT publish or take public bookings
   │                          │
   ▼                          │
Buildings / Floors            │
   │                          │
   ▼                          │
Rentable Resources            │
   │   + Rental Mode          │
   ▼                          │
Media + Virtual Tour          │
   │                          │
   ▼                          │
Create Listing                │
   │                          │
   ▼                          │
Submit for approval ◀─────────┘  verification must have passed
   │
   ▼
Platform Admin review
   │
   ├── Rejected ──▶ reason returned, owner revises
   ▼
PUBLISHED
   │
   ▼
Applications / Bookings arrive
   │
   ▼
Approve or reject
   │
   ▼
Leases and stays
   │
   ▼
Invoices → Payments → Ledger
   │
   ▼
Maintenance, reports, renewals
```

---

## Stage 1 — Sign up and create an Organization

Self-serve (D-10). No sales call, no waiting to get in.

| | |
|---|---|
| **Does** | Signs up, creates an Organization — *Santos Property Holdings* |
| **Sees** | A clear path to the first listing, and where verification sits on it |
| **Needs** | To start setting things up immediately |

The Organization is the **SaaS isolation boundary** (D-13). Everything the owner creates belongs to it. The word *tenant* is never used for this ([glossary.md](../../00-overview/glossary.md#the-tenant-rule)).

## Stage 2 — Verification

The platform verifies the Organization is a real business with the right to rent what it lists (D-11).

| | |
|---|---|
| **Does** | Submits business and property-ownership documents |
| **Sees** | Verification status and what is still needed |
| **Waits on** | A Platform Admin ([platform-admin/journey.md](../platform-admin/journey.md)) |

### The critical UX rule

> **An owner may build properties, resources, tours, and listings while verification is pending. They may not publish.**

This is deliberate. Verification protects marketplace quality, but a blocked owner churns (Risk 3 in [product-scope.md](../../00-overview/product-scope.md#risk-3--two-approval-gates-create-latency)). Setup is the slowest part of onboarding — authoring a virtual tour takes real effort — so it should happen *during* the wait, not after it.

| While pending | |
|---|---|
| Can | Create properties, buildings, floors, resources; upload media; author tours; draft listings; invite staff |
| Cannot | Publish a listing; accept public bookings or applications |

The UI must present this as progress, not as a locked door.

## Stage 3 — Build the property structure

| | |
|---|---|
| **Does** | Creates a Property — *ABC Apartment, 12 Mabini St., Cebu City* — then Buildings and Floors as needed |
| **Note** | A Property is **not rentable itself**. Nobody rents "ABC Apartment" ([glossary.md](../../00-overview/glossary.md#property)) |

Single-structure properties should not be forced through building and floor setup. A boarding house with 40 bed spaces should not require 40 manual creations either — bulk creation is a V1 usability requirement, not a nicety.

## Stage 4 — Create rentable resources

**The actual inventory** ([glossary.md](../../00-overview/glossary.md#rentable-resource)).

```
ABC Apartment
└── Building A
    └── 2nd Floor
        ├── Unit 203       ₱8,500/month     LONG_TERM
        └── Unit 204       ₱8,500/month     LONG_TERM

Villa Boarding House
└── Room 101
    ├── Bed A              ₱3,500/month     LONG_TERM
    └── Bed B              ₱3,500/month     LONG_TERM

Skyline Condo
└── Unit 101              ₱15,000/month     HYBRID
                          ₱1,500/night
```

Each resource is configured with a **Rental Mode** — `LONG_TERM`, `SHORT_TERM`, or `HYBRID` (D-17). Whether a `HYBRID` resource can offer both *simultaneously* is [U-01](../../00-overview/product-decisions.md#unresolved); the owner-facing implications of that answer are not decided yet, and the UI must not imply either.

Parking slots and storage are resources too — the platform does not assume rentable means habitable (D-05).

## Stage 5 — Media and virtual tour

**On the V1 critical path** (D-07). This is where owner effort concentrates, and where the biggest V1 risk sits.

| | |
|---|---|
| **Does** | Uploads photos; uploads 360° panoramas; places hotspots linking scenes; labels each scene; adds image, video, and info hotspots |
| **Needs** | Authoring simple enough that a notebook-based owner completes it |

```
Upload 360 panoramas
   │
   ▼
Label scenes            "Living Room" · "Kitchen" · "Bedroom"
   │
   ▼
Place navigation hotspots     living room ──▶ kitchen
   │
   ▼
Add detail hotspots           image · video · info
   │
   ▼
Preview as a customer would
   │
   ▼
Attach to listing
```

**Why this stage decides the feature's fate:** if authoring is too hard, listings ship without tours, and the differentiator evaporates ([product-scope.md](../../00-overview/product-scope.md#risk-2--virtual-tour-on-the-critical-path)). Preview-as-customer is essential — an owner must see what they built before publishing it.

Tours are per resource, or per property for shared spaces. Bed-space-level tours are out of scope; the room and shared facilities are what matter.

## Stage 6 — Create and publish listings

| | |
|---|---|
| **Does** | Creates a Listing for a resource: title, description, price, terms, move-in cost, availability; attaches media and tour; submits for approval |
| **Sees** | Approval status; rejection reasons; published state |

**A Listing is not the Resource** ([glossary.md](../../00-overview/glossary.md#listing)). The resource is *Bed A*; the listing is *"Bed A — Affordable Boarding House Near USC, ₱3,500/month, all-in utilities"*. The separation lets presentation change without touching inventory.

**Total move-in cost must be stated** — ₱8,500 rent plus 1 advance and 2 deposit is ₱25,500 to enter. Customers compare on this ([customer/journey.md](../customer/journey.md#stage-3--compare)), and hiding it produces applications that collapse at payment.

Listings require **admin approval** before going public (D-12). Rejections must come back with a reason specific enough to act on.

## Stage 7 — Availability and pricing

| Long-term | Short-term |
|---|---|
| Occupancy state — vacant, occupied, reserved, under maintenance | Date calendar — open, blocked, booked |
| Monthly rent | Nightly rate, with manual date overrides |
| | Minimum-stay rules |

Dynamic and seasonal pricing is deferred (D-24). V1 is a flat nightly rate plus manual overrides.

**Availability must stay true automatically.** A published listing whose resource is occupied is a bug, not a stale cache ([rental-lifecycle.md](../../00-overview/rental-lifecycle.md#cross-cutting-state-that-flows-back-to-the-marketplace)). Signing a lease or confirming a booking must take the resource off the market without the owner remembering to do it — that is the closure the whole product depends on.

## Stage 8 — Applications and bookings

### Long-term applications

| | |
|---|---|
| **Sees** | Applicants for a resource, with their attached documents |
| **Does** | Reviews and approves or rejects, with a reason |
| **Needs** | To do this from a phone — applications arrive while he is out |

The platform **does not score applicants** (D-27). It carries documents; the owner judges. Several customers may apply for one resource, and approving one must resolve the others honestly rather than leaving them waiting.

### Short-term bookings

No approval step — payment is the commitment ([rental-lifecycle.md](../../00-overview/rental-lifecycle.md#path-b--short-term-stay)). The owner sees confirmed bookings, upcoming check-ins, and the calendar.

## Stage 9 — Leases

| | |
|---|---|
| **Does** | Issues a lease on approval and initial payment: term, rent, deposit, advance, conditions |
| **Sees** | Active leases, terms, end dates, and the tenants under each |

A lease may cover several tenants (co-tenants). Splitting rent between them is V2.

**On lease creation, the customer gains tenant capabilities on the same account** (D-15). Nothing is re-registered.

## Stage 10 — Money

The stage the owner actually cares about ([payments-overview.md](../../00-overview/payments-overview.md)).

| | |
|---|---|
| **Sees** | Invoices raised, payments received, outstanding balances, who is overdue |
| **Does** | Raises invoices (recurring, automatic per period); reviews payments; issues refunds; settles deposits |
| **Needs** | To answer **"who owes me money this month?"** without a notebook |

That question is the pilot's success signal ([vision.md](../../00-overview/vision.md#what-success-looks-like-for-the-pilot)).

**The owner must be able to tell processed money from recorded cash** (D-09). A collection report that presents Marco's cash entries as though the platform processed them is not just imprecise — it misrepresents what the platform knows.

| Authority | Owner | Property Manager | Staff |
|---|---|---|---|
| Record an offline payment | Yes | Yes | Yes |
| Issue a refund | Yes | No | No |
| Waive an invoice | Yes | No | No |
| Settle a deposit | Yes | No | No |

Refunds are a **higher authority** than recording a payment: taking money in is operational, giving money back is financial.

## Stage 11 — Maintenance oversight

| | |
|---|---|
| **Sees** | Open requests across properties, ages, and what is stalled |
| **Does** | Assigns to staff; tracks to resolution |

Day-to-day handling belongs to [property-staff/journey.md](../property-staff/journey.md). The owner watches for what is slipping.

## Stage 12 — Staff

| | |
|---|---|
| **Does** | Invites Property Managers and Staff; assigns them to properties; sets their access |
| **Needs** | To delegate operations without handing over financial authority |

Staff management is the **Owner's alone** — a Property Manager cannot invite staff or widen their own access.

## Stage 13 — Reports

Two numbers matter; everything else is detail:

| | |
|---|---|
| **Occupancy** | How much inventory is earning |
| **Collection** | How much of what is owed has arrived |

Plus: overdue tenants, upcoming lease expiries, short-term booking calendar and revenue, maintenance load.

Deep analytics is V2. This is **not an accounting system of record** ([vision.md](../../00-overview/vision.md#what-this-platform-is-not)) — reports should export cleanly to whatever does the owner's books.

---

## What the owner can never do

| Cannot | Why |
|---|---|
| Publish before verification | Marketplace quality gate (D-11) |
| Publish a listing without admin approval | Marketplace quality gate (D-12) |
| Edit or delete a ledger entry | Append-only; corrections are new entries |
| Record a payment on a tenant's behalf as though the tenant made it online | Recording ≠ processing (D-09) |
| See other Organizations' data | Organization isolation (D-13) |
| Modify a lease unilaterally after signing | It is an agreement |
| Delete a maintenance request | Operational record |

---

## States the owner UI must handle

- **Nothing yet.** A brand-new organization. The empty state is the onboarding path, not a blank screen.
- **Verification pending.** Everything buildable, nothing publishable — shown as progress.
- **Verification rejected.** Specific, actionable reasons.
- **Listing rejected.** Specific reasons, and a fast path back to resubmission.
- **Resource occupied but listing still published.** Should be impossible; if detected, surfaced loudly.
- **Overdue tenants.** The most-used view in the product. It must be immediate.
- **Cash received but not yet recorded by staff.** Invisible to the owner by definition — which is exactly why recording latency is a metric worth watching.
- **Lease expiring soon.** Enough warning to renew or re-list.
