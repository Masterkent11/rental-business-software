# Customer Journey

> **Status:** Written
> **Owner step:** Step 1 — Product Definition
> **Last updated:** 2026-08-18
> **Depends on:** [personas.md](../../00-overview/personas.md), [rental-lifecycle.md](../../00-overview/rental-lifecycle.md)
> **Informs:** customer mobile app scope, [roles-and-permissions.md](../roles-and-permissions.md)

**Actor:** Customer — a person discovering, comparing, touring, booking, or applying for rentals.
**Primary surface:** Customer mobile app. Public web listings for search reach and desktop browsing.

---

## The account rule, stated first

**Customer → Tenant is an additive capability transition on the same account, not an identity replacement** (D-15).

```
                    User account
          ┌──────────────┴──────────────┐
          ▼                             ▼
      Customer                       Tenant
    capabilities                  capabilities
```

> Ana rents Condo 101 (Tenant) while browsing apartments near her new office (Customer). She is both, at the same time.

The product **must never** model this as:

```
Customer  →  Tenant  →  no longer Customer     ✗ WRONG
```

Becoming a tenant **adds** capabilities. It removes nothing. A tenant browsing for their next place is a normal, expected user — not an edge case. Nothing is re-registered, no data is re-keyed, and no second account exists.

---

## The journey

```
Discover
   │
   ▼
Search & filter
   │
   ▼
Compare listings
   │
   ▼
Listing detail  ──▶ photos
   │
   ▼
INTERACTIVE VIRTUAL TOUR          ← the trip-saving step
   │
   ▼
Enquire / request viewing         optional
   │
   ▼
   ├────────────────────┬─────────────────────┐
   ▼                    ▼
LONG-TERM            SHORT-TERM
Application          Select dates
   │                    │
   ▼                    ▼
Owner approval       Availability check
   │                    │
   ▼                    ▼
Payment              Booking + prepayment
(advance + deposit)     │
   │                    ▼
   ▼                 Reservation confirmed
LEASE                   │
   │                    ▼
   ▼                 Stay → Checkout → Completed
TENANT capabilities
added to same account
```

---

## Stage 1 — Discover

The customer arrives with a need and a budget. Entry points: the mobile app, or a public listing page found through search.

| | |
|---|---|
| **Does** | Browses featured and nearby listings; searches by area |
| **Sees** | Listings with a photo, price, type, location, and a **tour badge** where one exists |
| **Needs** | To believe listings are real and current |

The tour badge matters here. It is the first signal that this listing can be evaluated without a trip.

## Stage 2 — Search and filter

| Filter | V1 |
|---|---|
| Location — city, barangay, near a landmark | Yes |
| Price range (PHP) | Yes |
| Rental type — unit, room, bed space, parking, storage | Yes |
| Rental mode — monthly or nightly | Yes |
| Availability — available now, or specific dates for short-term | Yes |
| Has virtual tour | Yes |
| Amenities | Yes |
| Map view | Yes |
| Commute time from a workplace | No — V2 |

**Empty results are a real state**, not an error. Nothing near IT Park under ₱5,000 is a common outcome and should offer nearby areas or a saved search, not a dead end.

## Stage 3 — Compare

| | |
|---|---|
| **Does** | Saves favourites; compares a shortlist side by side |
| **Sees** | Price, total move-in cost, location, size, amenities, tour availability |
| **Needs** | **Total cost to move in** — not just monthly rent |

Comparing bare monthly rent is misleading in the Philippine market, where advance + deposit is typically three months of rent up front. A ₱8,500 unit costs ₱25,500 to enter. The listing must make that plain before the customer invests time in a viewing or application.

## Stage 4 — Listing detail

| | |
|---|---|
| **Sees** | Photos, description, price, **total move-in cost**, terms, amenities, location, house rules, availability, virtual tour entry |
| **Needs** | Enough to decide whether to tour, and then whether to commit |

For a bed space, the listing must be clear about what is shared — that is the whole question for that rental type.

## Stage 5 — Interactive virtual tour

**The step that removes wasted trips** (D-07). See [product-scope.md](../../00-overview/product-scope.md#interactive-virtual-tour).

```
360 Living Room ──▶ 360 Kitchen ──▶ 360 Bedroom
                        │
              image · video · info hotspots
```

| | |
|---|---|
| **Does** | Walks scene to scene; opens hotspots; zooms into details; goes fullscreen |
| **Sees** | Labelled scenes, a scene selector, image/video/info hotspots |
| **Needs** | It to load and run on a mid-range Android phone over mobile data |

**Requirements this places on V1:** graceful loading (the tour must not appear broken while a panorama downloads), a clear exit back to the listing, and a path straight from tour into booking or application. A customer convinced by the tour should not have to hunt for the next step.

**Fallback:** listings without a tour show photos. They should be visibly less compelling — that asymmetry is what motivates owners to author tours.

## Stage 6 — Enquire or request a viewing

Optional. Some customers want a physical viewing even after the tour, and some questions the listing does not answer.

| | |
|---|---|
| **Does** | Sends an enquiry, or requests a viewing time |
| **Sees** | Enquiry status and any reply |
| **Constraint** | Rental-context messaging only — the platform is not a chat product ([vision.md](../../00-overview/vision.md#what-this-platform-is-not)) |

---

## Path A — Long-term application

### Apply

| | |
|---|---|
| **Does** | Submits an application: intended move-in date, occupants, and supporting documents (ID, proof of income) |
| **Sees** | Exactly what the owner requires and why |
| **Needs** | To do it from a phone, photographing documents |

The platform **does not screen or score** the applicant (D-27). It carries the documents; the owner judges them.

Applying does **not** reserve the resource. Multiple customers may apply for the same one, and the customer should understand that.

### Wait for approval

The weakest point in the funnel. The customer has committed effort and now waits on someone else.

| | |
|---|---|
| **Sees** | Status: submitted → under review → approved / rejected |
| **Needs** | Notification the moment it changes; a clear reason if rejected |

A rejection should return them to searching with their profile and documents intact — not to the beginning.

### Pay and become a tenant

| | |
|---|---|
| **Does** | Pays advance + deposit — online, or in cash recorded by staff ([payments-overview.md](../../00-overview/payments-overview.md)) |
| **Then** | Lease is created; **tenant capabilities are added to the same account** |
| **Sees** | The lease, the receipt, and their new tenant view — without logging in again |

The handoff to [tenant/journey.md](../tenant/journey.md) happens here, and it must be seamless. Re-registration at this point would be the single most damaging break in the product.

---

## Path B — Short-term booking

**No application. No lease. The customer never becomes a Tenant** ([rental-lifecycle.md](../../00-overview/rental-lifecycle.md#path-b--short-term-stay)).

### Select dates and check availability

| | |
|---|---|
| **Does** | Picks check-in and check-out |
| **Sees** | Which nights are open; total price for the range; minimum-stay rules |
| **Needs** | Honest availability — a date shown as open must be bookable |

Unavailable dates suggest alternatives rather than failing.

### Book and pay

| | |
|---|---|
| **Does** | Confirms the booking and prepays in full — *3 × ₱1,500 = ₱4,500* |
| **Sees** | Total cost before committing; cancellation terms |
| **Note** | Payment **is** the commitment. There is no approval step |

If payment fails or expires, the dates return to inventory immediately.

### Stay and complete

| | |
|---|---|
| **Sees** | Confirmation, check-in details, the address, and how to contact the property |
| **Then** | Checks in, stays, checks out; the booking completes and the dates release |

After checkout the guest keeps their booking history. Whether any further relationship persists is [U-04](../../00-overview/product-decisions.md#unresolved) — do not assume one.

---

## What the customer can never do

| Cannot | Why |
|---|---|
| Record their own offline payment | A person cannot attest to their own cash (D-09) |
| See another customer's application or booking | Privacy |
| Contact an owner outside rental context | Not a communications platform |
| See unpublished or unapproved listings | Admin approval gate (D-12) |
| Book dates that overlap an existing booking or lease | Availability integrity — see [U-01](../../00-overview/product-decisions.md#unresolved) |

---

## States the app must handle

Not exceptions — normal life:

- **Empty search.** Nothing matches. Offer nearby areas or a saved search.
- **Listing taken while browsing.** The resource was let to someone else. Say so honestly and suggest similar listings; do not silently 404.
- **Application rejected.** Return to search with profile and documents intact.
- **Payment failed.** Long-term: the approval stands, retry payment. Short-term: dates release immediately and the customer is told.
- **Tour fails to load.** Fall back to photos rather than showing a broken viewer.
- **Customer is also a tenant.** Both capability sets available at once, with no confusion about which is which (D-15).
