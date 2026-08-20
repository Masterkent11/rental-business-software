# Product Scope

> **Status:** Written
> **Owner step:** Step 1 — Product Definition
> **Last updated:** 2026-08-18
> **Depends on:** [product-decisions.md](product-decisions.md), [vision.md](vision.md), [glossary.md](glossary.md)
> **Informs:** [11-implementation](../11-implementation/) roadmap and every phase document

What V1 is, what it is not, and what it costs. Every decision referenced here (`D-xx`, `U-xx`) is canonical in [product-decisions.md](product-decisions.md).

---

## V1 in one paragraph

A Philippine property owner signs up, creates an Organization, gets verified, adds properties and rentable resources (units, rooms, bed spaces, parking), authors an interactive 360° virtual tour, and publishes listings after admin approval. Customers search, tour, and either **apply** for a long-term rental or **book** nightly dates. Payment happens online or is recorded by staff when it arrives as cash. Long-term customers become tenants under a lease with recurring invoices; short-term guests stay and check out. Tenants pay rent, request maintenance, and can prove what they paid.

---

## Market constraint

**Philippines only** (D-02).

| | V1 |
|---|---|
| Currency | PHP only. No multi-currency |
| Addresses | PH format — barangay, city/municipality, province, ZIP |
| Payment methods | GCash, Maya, cards — plus cash, recorded by staff |
| Lease norms | Advance + deposit (typically 1 advance + 2 deposit) |
| Language | English UI. Filipino localization is V2 |
| Taxes | Not computed. Owners handle BIR obligations outside the platform |

Multi-country is **deferred, not designed for** (D-25). Speculative abstraction for a second country is explicitly not done in V1 — if and when a second market arrives, that is a deliberate re-scoping.

---

## Rental types

All four ship in V1 (D-03 … D-06). Each is a **Rentable Resource**; the platform does not assume a rentable thing is a habitable dwelling.

### Long-term residential — units

> *Unit 203, ABC Apartment — ₱8,500/month*

**Supports:** application with document attachments, owner approval, lease with term and conditions, advance + deposit collection, recurring monthly invoices, online and offline rent payment, maintenance requests, renewal and termination with deposit settlement.

**Does not support:** rent splitting between co-tenants (V2), automated rent escalation, utility sub-metering and billing, tenant screening or credit checks (D-27).

### Rooms and bed spaces

> *Bed A, Room 101, Villa Boarding House — ₱3,500/month*

**Supports:** nested resources (bed inside room inside building), independent leases per bed, per-bed availability and occupancy, shared-facility description on the listing, high-turnover workflows (semester cycles).

**Does not support:** roommate matching, gender/occupancy-rule enforcement beyond descriptive text, bed-level virtual tours (the tour covers the room and shared spaces).

### Parking and storage

> *Parking Slot 12 — ₱2,000/month*

**Supports:** non-habitable rentable resources, long-term lease with recurring invoicing, standalone listing or add-on described alongside a unit.

**Does not support:** automatic bundling with a unit lease as a single billed line (V2), vehicle registration tracking, access control or gate integration.

### Short-term nightly

> *Condo Unit 101 — ₱1,500/night*

**Supports:** date-range availability calendar, nightly rate with manual date overrides, minimum-stay rules, prepaid booking, confirmation, check-in/check-out, cancellation with refund rules.

**Does not support:** dynamic or seasonal pricing (D-24), channel-manager sync with external platforms, guest reviews and ratings (V2), cleaning-fee automation, self-check-in / smart-lock integration.

---

## Interactive Virtual Tour

**Ships in V1, on the critical path** (D-07). This supersedes an earlier decision to defer it. It is a navigable walkthrough, not a gallery.

```
360 Living Room ──hotspot──▶ 360 Kitchen ──hotspot──▶ 360 Bedroom
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
                  image         video          info
```

### V1 feature set

| | |
|---|---|
| 360° scenes | Panoramic viewpoints per room or area |
| Scene-to-scene hotspot navigation | Walk from living room to kitchen |
| Smooth scene transitions | Movement should feel continuous, not like slides |
| Scene / room labels | Always know where you are standing |
| Image hotspots | Close-ups — fixtures, damage, details |
| Video hotspots | Short clips (water pressure, view from balcony) |
| Info hotspots | Text notes ("Inverter aircon, included in rent") |
| Scene selector | Jump directly to any scene |
| Zoom | Inspect detail within a scene |
| Fullscreen | Immersive viewing |
| Mobile-optimized viewer | The primary surface is a phone on mobile data |

### V2 and beyond

Floor-plan navigation (D-18) · guided tour paths (D-19) · AI-generated tours (D-20) · voice narration (D-21) · VR headset support (D-22) · advanced tour analytics (D-23) · advanced interactive media.

### Consequence

The tour is a **first-class discovery step**, not an enhancement:

```
Search → Listing → Photos → Interactive Virtual Tour → Availability → Book / Apply → Pay
```

This means V1 must ship 360° asset upload and storage, a hotspot authoring experience owners can actually use, and a performant mobile viewer. That is real scope, accepted deliberately for the reason in [vision.md](vision.md#why-the-virtual-tour-is-core-not-decoration).

---

## Product surfaces

Three surface families. **Product-level definition only** — this is not an architecture decision, and nothing here settles frameworks, repos, or deployment.

```
                    RENTAL PLATFORM
      ┌───────────────────┼────────────────────┐
      ▼                   ▼                    ▼
  CUSTOMER        OWNER APPS │ TENANT APPS   SUPER ADMIN
    APP           (distinct actors)              WEB

  Discover        Manage / Operate            Governance
  Explore         Rent / Lease                Moderation
  Tour            Payments                    Support
  Book            Maintenance                 Audit
  Pay             Documents                   Reports
```

> **Binding clarification (D-16):** Owner and Tenant are **distinct actors** with different capabilities, journeys, and responsibilities. Grouping their surfaces into one family above is a **packaging convenience only**. No document, model, permission set, or UI may treat "Owner/Tenant" as a single combined role. They may share components and infrastructure later; they are never the same persona.

| Surface | Actor | V1 |
|---|---|---|
| Customer mobile app | Customer | Yes — the primary discovery surface |
| Public web listings | Customer | Yes — read-only, for search-engine reach and desktop browsing |
| Owner web | Owner, Property Manager | Yes — the primary management surface |
| Owner mobile | Owner, Property Manager, Staff | Yes — narrow: approvals, recording payments, maintenance |
| Tenant web | Tenant | Yes |
| Tenant mobile | Tenant | Yes — the primary tenant surface |
| Super Admin web | Platform Admin, Support, Finance | Yes |

**Super Admin web covers:** organizations, verification queue, listings and moderation, users, bookings, payments, reports, support tooling, audit log.

---

## Rental modes

A Rentable Resource is configured for how it may be rented (D-17):

| Mode | Meaning |
|---|---|
| `LONG_TERM` | Monthly rental under a lease |
| `SHORT_TERM` | Nightly booking |
| `HYBRID` | Capable of both |

> *Condo Unit 101 — mode `HYBRID`. Long-term ₱15,000/month, short-term ₱1,500/night.*

This is a **product concept in Step 1.** How it is modelled is Step 2's decision, and one question is deliberately left open:

> **[U-01](product-decisions.md#unresolved) — May one resource participate in long-term and short-term availability *simultaneously*?**
>
> If **yes**: availability must reconcile two inventory models on one resource, and guarantee a nightly booking can never land inside an active lease.
> If **no**: `HYBRID` means switchable between modes, and the active mode owns the calendar.
>
> **This must not be settled by an implementation detail.** It belongs to Step 2, decided explicitly.

---

## V1 scope by actor

### Customer

Search and filter (location, price, type, availability) · listing detail with photos · **interactive virtual tour** · compare listings · save favourites · enquire · request a viewing · submit an application with documents · select dates and check availability · book a short-term stay · pay online · track application and booking status · notifications · become a tenant on the same account.

### Tenant

View lease and terms · view invoices and balance · pay rent online · see staff-recorded cash payments appear · receipts for both kinds · lease and payment documents · submit maintenance requests with photos · track maintenance status · notifications · request renewal · initiate move-out.

### Property Owner

Sign up and create Organization · submit for verification · build properties, buildings, floors · create rentable resources with rental modes · upload media and author virtual tours · create listings and submit for approval · publish and unpublish · manage availability and pricing · review and approve applications · manage bookings · issue and manage leases · raise and track invoices · view payments (online and recorded) · issue refunds · manage maintenance · manage staff and their access · reports on occupancy and collection.

### Property Manager

Everything operational the Owner can do for assigned properties, excluding: organization settings, staff management, and refund authority. Listing publish authority pending [U-03](product-decisions.md#unresolved).

### Staff

View assigned resources · **record offline payments** · create and update maintenance requests · update occupancy status. Deliberately narrow — see [personas.md](personas.md#staff).

### Platform Admin / Support / Finance

Verify organizations · approve, reject, and moderate listings · look up users and their rental history · oversee bookings and payments · reconcile against provider settlements · handle refunds and disputes · platform reports · audit log.

---

## V2 / future scope

Decided not to build now (D-18 … D-27), not open questions.

| Area | Deferred |
|---|---|
| Virtual tour | Floor-plan navigation, guided paths, AI generation, narration, VR, advanced analytics |
| Pricing | Dynamic and seasonal pricing, automated rent escalation |
| Payments | Auto-debit recurring charges, installment plans, rent splitting between co-tenants |
| Marketplace | Guest reviews and ratings, channel-manager sync, in-app messaging beyond rental context |
| Operations | External contractor accounts, utility sub-metering and billing, smart-lock / self-check-in |
| Screening | Tenant screening, credit checks, employment verification |
| Platform | Multi-country, multi-currency, Filipino localization, owner/agency hierarchies |
| Analytics | Deep owner analytics beyond occupancy and collection reporting |

---

## Non-goals

Permanent. Not "later" — see [vision.md](vision.md#what-this-platform-is-not).

- **Not a broker or agency.** The platform does not represent either side or employ agents.
- **Not escrow or lending.** No holding funds as a trusted third party, no deposit financing, no rent credit.
- **Not an accounting system of record.** Rental money only; no statutory statements, payroll, or tax filing.
- **Not a screening bureau.** No applicant scoring or credit checks.
- **Not real-estate sales, valuation, or construction.** Rental only.
- **Not a general communications platform.** Rental-context notifications and messaging only.

---

## Scope risks

Stated with consequences, not hidden.

### Risk 1 — Short-term and long-term in the same V1

**The largest scope multiplier in V1** (D-06). The two lifecycles diverge permanently after listing selection ([rental-lifecycle.md](rental-lifecycle.md)) and need genuinely different machinery:

| | Long-term | Short-term |
|---|---|---|
| Availability | Occupancy state | Date-range calendar |
| Pricing | Monthly rent | Nightly rate |
| Commitment | Application → approval → lease | Payment |
| Money | Recurring invoices, chased | Prepaid once |
| Ends by | Renewal / termination + deposit settlement | Checkout |

**Consequence, accepted:** the implementation work for availability, pricing, booking, invoicing, and payments is roughly **double** what either path alone would need. Short-term is never forced through `Application → Lease → Tenant` — a two-night stay has no lease.

**What reduces the risk without cutting scope:** treating them as two paths over one resource from the very first domain sketch, rather than building long-term and retrofitting short-term. Retrofitting is where this becomes expensive.

### Risk 2 — Virtual tour on the critical path

**Consequence, accepted:** V1 cannot ship without 360° upload and storage, an authoring experience owners will actually complete, and a viewer that performs on mid-range Android phones over mobile data. Any of the three being weak makes the feature decorative — which is precisely what deferring it to V2 would have meant.

**The specific risk:** authoring. Owners with a notebook-based workflow must be able to place hotspots successfully. If tour creation is too hard, listings ship without tours and the differentiator evaporates. Authoring usability is a V1 requirement, not polish.

### Risk 3 — Two approval gates create latency

Organization verification (D-11) and listing approval (D-12) both protect marketplace quality, and both make owners wait. **Consequence:** the platform needs staffed queues with real SLAs from day one. An owner blocked for a week churns. Mitigated in product by letting unverified owners do all setup work — everything except publishing.

### Risk 4 — The offline payment path is a trust surface

Staff-recorded cash (D-08, D-09) is essential to being usable in the Philippine market and is inherently weaker evidence than a processed payment. **Consequence:** every offline recording carries who, when, and against what; the ledger is append-only; corrections are new entries; and no report may present recorded cash as though the platform processed it. See [payments-overview.md](payments-overview.md).

---

## Pilot definition

V1 is launched when a small number of real owners run real rentals through the platform instead of their notebooks. Signals, from [vision.md](vision.md#what-success-looks-like-for-the-pilot):

- An owner answers "who owes me money this month?" from the platform alone.
- A tenant pays through the platform twice consecutively, unchased.
- Staff record cash the same day, unprompted.
- A customer signs a lease having viewed the property only through the virtual tour.
- Published listings are accurate — no "sorry, that's taken".

Minimum viable footprint for the pilot:

| | |
|---|---|
| Organizations | 3–5 real owners, verified |
| Properties | Mixed: an apartment building, a boarding house with bed spaces, one hybrid short-term resource |
| Rentable resources | ~50 |
| Active leases | ~20 |
| Short-term bookings | Enough to exercise the path end to end |
| Payment paths | Both online and staff-recorded exercised in production |
| Virtual tours | Authored by the owners themselves, not by the platform team |

That last line is the real test. If tours only exist when we make them, the feature has not shipped.
