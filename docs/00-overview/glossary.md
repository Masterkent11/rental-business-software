# Glossary

> **Status:** Written
> **Owner step:** Step 1 — Product Definition
> **Last updated:** 2026-08-18
> **Depends on:** [product-decisions.md](product-decisions.md)
> **Informs:** every document, every schema column, every API field name

This document locks the vocabulary **before** any code exists. Terms defined here mean exactly this, everywhere: in documentation, in domain code, in database columns, in API contracts, and in UI copy.

If a later step needs a concept this glossary does not have, the glossary gains an entry first.

---

## The `tenant` rule

**This is the most important entry in this document.**

The word *tenant* means two completely different things in this industry, and letting both survive would make `tenant_id` ambiguous — which is exactly the column our entire multi-tenancy and row-level-security design will depend on.

```
PLATFORM TENANCY                    RENTAL TENANCY
        │                                  │
        ▼                                  ▼
  Organization                          Tenant
        │                                  │
  The SaaS customer.               A person occupying
  Owns properties.                 a rentable resource
  Employs Owner,                   under a lease.
  Property Manager,
  Staff.
```

| Use | Term | Identifier |
|---|---|---|
| SaaS isolation boundary | **Organization** | `organization_id` |
| Person renting a place | **Tenant** | `tenant_id` |

**Never**:

- write "tenant" meaning the SaaS boundary
- name a multi-tenancy column `tenant_id`
- call this product a "tenant management SaaS" — it is a **multi-tenant rental marketplace + property management platform**

The phrase "multi-tenant" is acceptable only as the standard industry adjective for the architecture, never as a noun referring to our Organizations.

---

## Structural terms

### Organization

The SaaS isolation boundary. A business or individual that owns or manages rental properties on the platform, along with the staff working under it.

> **Example:** *Santos Property Holdings* — owns three apartment buildings in Cebu and a boarding house near a university.

- Every tenant-owned business record belongs to exactly one Organization.
- An Organization must be **verified** by a Platform Admin before it may publish anything (D-11).
- **Not to be confused with:** a Tenant (a person), or a Property (a building).

### Property

A physical, real-world property at a single address. The thing you could point at from the street.

> **Example:** *ABC Apartment, 12 Mabini St., Cebu City*

- Belongs to one Organization.
- Contains Buildings, Floors, and Rentable Resources.
- A Property is **not rentable itself** — you rent something inside it.
- **Not to be confused with:** a Rentable Resource. Nobody rents "ABC Apartment"; they rent Unit 203.

### Building

A structure within a Property. Present for properties with more than one structure; a single-structure property may have exactly one implicit Building.

> **Example:** *ABC Apartment → Building A* and *Building B*

### Floor

A level within a Building, used for organization and wayfinding.

> **Example:** *Building A → 2nd Floor*

### Rentable Resource

**The actual thing a person rents.** The unit of inventory. If money changes hands for occupying it, it is a Rentable Resource.

> **Examples:**
> - *Unit 203* — a one-bedroom apartment, ₱8,500/month
> - *Room 4* — a private room in a boarding house
> - *Bed A* — a single bed space in Room 4, ₱3,500/month
> - *Parking Slot 12* — ₱2,000/month
> - *Condo Unit 101* — ₱15,000/month long-term **or** ₱1,500/night short-term

Rentable Resources nest. A bed space lives inside a room, which lives inside a unit:

```
Property: Villa Boarding House
└── Building A
    └── 2nd Floor
        ├── Room 101
        │    ├── Bed A   ← Rentable Resource
        │    └── Bed B   ← Rentable Resource
        └── Room 102
             ├── Bed A   ← Rentable Resource
             └── Bed B   ← Rentable Resource
```

- Carries a **Rental Mode** (see below).
- **Not to be confused with:** a Listing. The resource is the real thing; the listing is how it is advertised.

### Rental Mode

How a Rentable Resource may be rented: `LONG_TERM`, `SHORT_TERM`, or `HYBRID`.

> **Example:** *Condo Unit 101* — Rental Mode `HYBRID`; ₱15,000/month long-term, ₱1,500/night short-term.

- A product-level concept in Step 1. **How it is modelled is Step 2's decision.**
- Whether a `HYBRID` resource can offer both simultaneously, or only switch between them, is **unresolved** — see [U-01](product-decisions.md#unresolved). Do not assume either answer.

---

## Marketplace terms

### Listing

The public marketplace representation of a Rentable Resource: title, description, photos, virtual tour, price, terms, and what a customer actually sees when searching.

> **Example:** *"Bed A — Affordable Boarding House Near USC, ₱3,500/month, all-in utilities"* representing the resource *Bed A, Room 101*.

- A Listing points at a Rentable Resource. It is not the resource.
- Requires **admin approval** before going public (D-12).
- The separation matters: the same resource may later be presented differently — different photos, different framing for long-term vs nightly, a seasonal description — without the physical inventory changing. Conversely, a listing can be unpublished while the resource is still occupied.
- **Not to be confused with:** a Rentable Resource.

### Availability

Whether, and when, a Rentable Resource can be rented.

The shape of availability differs by rental mode, and this is a real modelling divergence, not a detail:

| Mode | Availability means |
|---|---|
| Long-term | Occupancy state — vacant, occupied, reserved, under maintenance |
| Short-term | A date-range calendar — which nights are open, blocked, or booked |

### Virtual Tour

An interactive 360° walkthrough of a Rentable Resource or Property, made of Scenes connected by Hotspots. **Ships in V1** (D-07).

> **Example:** *Unit 203 tour* — 360 Living Room → hotspot → 360 Kitchen → hotspot → 360 Bedroom, with an info hotspot on the aircon unit and a video hotspot showing the water pressure.

- **Not to be confused with:** a photo gallery. A gallery is a set of flat images; a tour is navigable space.

### Scene

A single 360° panoramic viewpoint within a Virtual Tour, with a human-readable label.

> **Example:** *"Living Room"*, *"Kitchen"*, *"Balcony view"*

### Hotspot

An interactive point placed inside a Scene. Four kinds in V1:

| Kind | Does |
|---|---|
| Navigation | Moves to another Scene |
| Image | Opens a photo (close-up of a fixture, a detail shot) |
| Video | Plays a short video clip |
| Info | Shows a text note ("Inverter aircon, included in rent") |

---

## Transaction terms

### Booking

A reservation of a Rentable Resource for specific dates. **Short-term concept.**

> **Example:** *Condo Unit 101, 3 nights, Dec 2629, ₱4,500 total*

- Confirmed by payment, and becomes a Stay.
- **Not to be confused with:** an Application. A booking reserves dates; an application requests to live somewhere.

### Application

A request to rent a Rentable Resource long-term, submitted by a Customer and approved or rejected by an Owner or Property Manager.

> **Example:** *Ana applies for Unit 203, move-in Sept 1, with proof of income attached.*

- **Long-term only.** A two-night stay has no application (D-06).
- Approval leads to a Lease.

### Stay

A confirmed short-term occupancy with a check-in and check-out date.

> **Example:** *Dec 26 check-in, Dec 29 check-out, Condo Unit 101*

- Produced by a paid Booking.
- **Has no Lease and creates no Tenant.** A guest for two nights is not a tenant.

### Lease

The long-term rental agreement between an Organization and one or more Tenants for a specific Rentable Resource: term, rent, deposit, advance, and conditions.

> **Example:** *Unit 203, 12 months from Sept 1, ₱8,500/month, 1 month advance + 2 months deposit*

- Produced by an approved Application plus initial payment.
- Generates recurring Invoices.
- **Not to be confused with:** a Booking or a Stay.

### Tenant

**A person occupying a Rentable Resource under a Lease.** Nothing else. See [the `tenant` rule](#the-tenant-rule).

> **Example:** *Ana Reyes, tenant of Unit 203 under lease L-2026-0142*

- One lease may have several Tenants (co-tenants sharing a unit).
- A Tenant is a User with tenant capabilities — not a separate account, and not an ex-Customer (D-15).

### Customer

A person discovering, comparing, touring, booking, or applying for rentals. Not yet renting anything through the platform — **or renting one thing while shopping for another.**

> **Example:** *Ana already rents Condo 101 and is browsing apartments near her new office.* She is a Tenant **and** a Customer at the same time.

- Customer and Tenant are **capabilities on one User account**, not sequential identities.

### Invoice

An amount owed by a Tenant to an Organization, with a due date.

> **Example:** *INV-2026-09-0142 — Unit 203, September rent, ₱8,500, due Sept 5*

- **An invoice is not money.** It is a claim.

### Payment

Money actually received, recorded against an invoice or a booking.

> **Example:** *₱8,500 received Sept 3 via GCash* — or *₱8,500 cash handed to staff on Sept 3 and recorded by them.*

- **Payment ≠ Invoice.** Conflating them is how rental systems end up unable to answer "who actually owes us money?"
- Two origins, and the distinction is permanent: **online payment** (the platform processed the money) vs **offline payment recording** (staff attest that cash changed hands; the platform processed nothing). See [payments-overview.md](payments-overview.md).

### Ledger

The append-only record of financial events — invoices raised, payments received, adjustments, refunds — for an Organization.

- Both online payments and staff-recorded offline payments land here, tagged with which they were.
- The ledger is the answer to "what happened, and when, and who says so".

### Deposit

Money held against damage or unpaid obligations, returnable at end of lease. Distinct from **advance**, which is prepaid rent.

> **Example, PH-typical:** *1 month advance (₱8,500) + 2 months deposit (₱17,000) on signing.*

- Whether a deposit is a payment against an invoice or a held balance with its own lifecycle is **unresolved** — see [U-02](product-decisions.md#unresolved).

---

## Operational terms

### Maintenance Request

An operational issue reported against a Rentable Resource.

> **Example:** *"Kitchen faucet leaking" — Unit 203, reported by tenant Sept 12, photo attached*

- Reported by a Tenant, or raised by Staff.
- Whether short-term guests may raise them is **unresolved** — see [U-05](product-decisions.md#unresolved).

### Verification

The platform's check that an Organization is a real business with a real right to rent out what it lists, performed by a Platform Admin.

- Gates **publishing**, not account creation or setup work (D-10, D-11).

### Approval

Two different things share this word, so always qualify it:

| Phrase | Who decides | About what |
|---|---|---|
| **Listing approval** | Platform Admin | Whether a listing may go public |
| **Application approval** | Owner or Property Manager | Whether a customer may rent |

---

## Actor terms

Defined fully in [personas.md](personas.md); listed here so the vocabulary is complete.

| Term | Definition |
|---|---|
| **User** | An account. Holds one or more capabilities |
| **Customer** | Discovers and books/applies |
| **Tenant** | Occupies under a lease |
| **Property Owner** | Owns properties; the Organization's principal |
| **Property Manager** | Manages properties on an Owner's behalf |
| **Staff** | Limited day-to-day operational access |
| **Platform Admin** | Runs the platform |
| **Support** | Assists customers, owners, and tenants |
| **Finance** | Handles payment operations and reconciliation |

---

## Terms we deliberately do not use

| Avoid | Use instead | Why |
|---|---|---|
| "Tenant" for the SaaS boundary | Organization | See [the `tenant` rule](#the-tenant-rule) |
| "Unit" as a universal term for inventory | Rentable Resource | A bed space and a parking slot are not units |
| "Property" for the thing being rented | Rentable Resource | Nobody rents a whole building |
| "Reservation" | Booking, or Stay | Two terms for one thing invites drift |
| "Renter" | Customer, or Tenant | Ambiguous about whether they have signed |
| "Client" | Customer, or Organization | Ambiguous about which side of the marketplace |
