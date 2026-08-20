# Product Vision

> **Status:** Written
> **Owner step:** Step 1 — Product Definition
> **Last updated:** 2026-08-18
> **Depends on:** [product-decisions.md](product-decisions.md), [glossary.md](glossary.md)
> **Informs:** [product-scope.md](product-scope.md), all journey documents

## The product in one sentence

A multi-tenant **rental marketplace + property management platform** that lets Philippine property owners digitize their rental operations, while letting renters discover, walk through, book, pay for, and manage rentals entirely from their phone.

## The problem

Rental operations in the Philippines run on group chats, notebooks, and cash.

An owner with three buildings tracks who has paid using a spiral notebook and a Messenger thread per tenant. A boarding house near a university turns over dozens of bed spaces every semester, each one negotiated by text. A prospective renter takes a jeepney across the city to view a unit that turns out to be nothing like the two blurry photos in the Facebook post — and does that five times before signing anything.

Both sides lose the same two things: **time and trust.**

- The owner cannot answer "who owes me money this month?" without reconstructing it by hand.
- The renter cannot tell whether a listing is real, current, or accurately described, without physically going there.

## The insight

These are usually built as two products — a marketplace for finding places, and property-management software for running them. Splitting them is what keeps both weak.

A marketplace with no operational system has stale inventory: listings stay up after the unit is taken, because nothing tells the listing that a lease was signed.

A management system with no marketplace has no demand: it digitizes the paperwork after the hard part is already done.

**Joining them is the product.** When the lease is the same system as the listing, the marketplace is accurate by construction. When the renter and the tenant are the same account, nothing is re-keyed and nothing is lost at the handoff.

## The value loop

```
   Owner supplies inventory
             │
             ▼
   Platform publishes it (verified, approved)
             │
             ▼
   Customer discovers ──▶ Interactive Virtual Tour
             │
             ▼
   Books (short-term)  or  Applies (long-term)
             │
             ▼
          Payment
             │
        ┌────┴─────┐
        ▼          ▼
      Stay       Lease
        │          │
        │          ▼
        │       Tenant
        │          │
        │          ▼
        │   Recurring rent + Maintenance
        │          │
        └────┬─────┘
             ▼
   Operational truth flows back to inventory
   (occupied resources stop being bookable)
```

The loop closes at the bottom. That closure — operations feeding back into the marketplace automatically — is the thing neither half can do alone.

## Why the virtual tour is core, not decoration

The single most expensive step in the Philippine rental funnel is **physically visiting a place that was never going to work.** It costs the renter a half-day and fare; it costs the owner and staff a viewing appointment that leads nowhere.

An interactive 360° walkthrough — living room to kitchen to bedroom, with hotspots for the details that photos hide — removes most of those wasted trips. It is not a gallery upgrade. It changes what the funnel costs on both sides, which is why it sits on the V1 critical path (D-07) rather than waiting for V2.

```
Search → Listing → Photos → Interactive Virtual Tour → Availability → Book / Apply → Pay
```

## Why cash stays first-class

A large share of Philippine rent is paid in cash, in person. A platform that only understands online payments does not eliminate cash — it just stops knowing about it, and its ledger becomes fiction within a month.

So the platform accepts online payment **and** lets staff record cash they received, in one ledger, with the two kinds permanently distinguishable (D-08, D-09). The distinction is not a technicality: in one case the platform moved the money and can prove it; in the other, a staff member is attesting that money changed hands. Those carry different trust, different audit needs, and different dispute paths, and conflating them would be a financial-integrity bug, not a convenience.

## Who this is for

Six actors, described fully in [personas.md](personas.md):

| | |
|---|---|
| **Customer** | Finding a place |
| **Tenant** | Living in one, paying rent |
| **Property Owner** | Owns the inventory, wants it filled and paid |
| **Property Manager / Staff** | Runs it day to day |
| **Platform Admin / Support / Finance** | Keeps the marketplace honest and the money reconciled |

## What success looks like for the pilot

The pilot is not "the software works." It is a small set of real owners running real rentals through the platform instead of their notebooks.

| Signal | Why it is the right signal |
|---|---|
| An owner can answer "who owes me money this month?" from the platform, without checking a notebook | The ledger became the truth, not a copy of it |
| A tenant pays rent through the platform twice in a row without being chased | Trust and habit, not a one-time trial |
| Staff record cash payments the same day, unprompted | The offline path is usable enough not to be bypassed |
| A customer signs a lease having seen the place only through the virtual tour | The most expensive funnel step became optional |
| Published listings are accurate — no "sorry, that's taken" | The loop actually closed |

If those five hold for a handful of owners, the model works and scale is an engineering problem. If they do not, no amount of scale helps.

## What this platform is not

Stating these now prevents scope arguments later. These are permanent positions, not deferrals.

**Not a broker or agency.** The platform does not represent either side in a transaction, does not take a position on the deal, and does not employ agents. Owners list; customers rent; the platform is the venue and the record.

**Not an escrow or lending service.** We do not hold money as a trusted third party, do not finance deposits, and do not extend credit for rent. Payments flow via a licensed provider; deposits are the Organization's obligation to its tenant. Becoming a money-holder is a regulated business we are not entering.

**Not an accounting system of record.** The ledger tracks rental money — invoices, payments, deposits. It is not general accounting, does not produce statutory financial statements, does not handle payroll or non-rental expenses, and does not replace an owner's bookkeeper or BIR filing. It should export cleanly to whatever does.

**Not a background-check or screening bureau.** Owners may attach documents to applications and judge them. The platform does not score applicants, run credit checks, or verify employment (D-27).

**Not a construction, valuation, or real-estate-sales product.** No buying, selling, or appraising property. Rental only.

**Not a communications platform.** Notifications and rental-context messaging, yes. General chat, calls, and social features, no.

## The governing constraint

Everything above depends on the domain being modelled correctly — especially the divergence between long-term leases and short-term stays, and the strict separation of **Organization** (SaaS boundary) from **Tenant** (a person who lives somewhere).

That is why this repository is documentation before code, and why the domain model is designed and frozen before a schema is written. See [docs/README.md](../README.md).
