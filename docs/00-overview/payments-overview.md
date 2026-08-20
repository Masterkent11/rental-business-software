# Payments Overview

> **Status:** Written
> **Owner step:** Step 1 — Product Definition
> **Last updated:** 2026-08-18
> **Depends on:** [glossary.md](glossary.md), [product-decisions.md](product-decisions.md)
> **Informs:** [03-domain](../03-domain/) payment model, [07-integrations/payments](../07-integrations/), [08-security/audit-logging](../08-security/)

This is the **product-level** payment model. It settles what the platform claims about money — not how it is implemented. Provider choice, webhook design, reconciliation mechanics, and ledger schema belong to later steps.

## The one distinction that must survive

The platform accepts money two ways, and they are **not the same kind of event**:

```
ONLINE PAYMENT                        OFFLINE PAYMENT RECORDING
────────────────                      ─────────────────────────

Customer / Tenant                     Tenant
   owes ₱8,500                           pays ₱8,500 in cash
        │                                     │
        ▼                                     ▼
   Pays online                           Property Staff
        │                                     │
        ▼                                     ▼
  GCash / Maya / Card                   Records the payment
        │                                     │
        ▼                                     ▼
   Payment provider                      LEDGER
        │                                     │
        ▼                                     ▼
   Confirmed                              Receipt issued
        │
        ▼
    LEDGER
        │
        ▼
    Receipt issued

The platform MOVED the money.          The platform moved NOTHING.
It can prove it independently.         A staff member ATTESTS it happened.
```

> **Recording an offline payment is not payment processing.** (D-09)

The two paths produce the same *outcome* — the invoice is settled, the ledger records it, the tenant gets a receipt — but they carry fundamentally different **evidence**.

| | Online payment | Offline recording |
|---|---|---|
| Who moved the money | The payment provider | Two people, in a room |
| Platform's knowledge | Independent, verifiable | Second-hand, asserted |
| Source of truth | Provider transaction record | A staff member's word |
| Failure mode | Provider mismatch, webhook loss | Error, forgetfulness, or fraud |
| Trust model | Verify against the provider | Trust the recorder, and audit them |
| Reversible by | Refund through the provider | Correcting an entry, with a trail |

## Why this matters more than it looks

If both paths were stored as simply "a payment", the ledger would claim a certainty it does not have. Every downstream financial capability would inherit that lie:

- **Reconciliation** compares platform records against provider settlement reports. Offline payments have no provider side to reconcile against — including them in that comparison makes it permanently fail to balance, and a reconciliation that never balances is one nobody reads.
- **Disputes** resolve differently. "The provider says it settled" ends an argument. "Staff member Marco says you paid" begins one — and needs to know *which* staff member, when, and what they wrote down.
- **Audit** must be able to answer "who asserted this, and when?" for every offline entry. That question is meaningless for online payments and essential for offline ones.
- **Fraud** looks different. Online fraud is a provider-side problem. Offline fraud is a staff member pocketing cash and recording it — or recording it and not pocketing it. Only the audit trail catches that.

So the distinction is preserved permanently, at every layer: in the domain, in the ledger, in the receipt, and in what a report is allowed to claim.

## What V1 supports

| Capability | V1 |
|---|---|
| Online payment via provider (GCash, Maya, card) | Yes |
| Staff recording of cash payments | Yes |
| Staff recording of bank transfers / deposit slips | Yes |
| Both landing in one ledger, permanently distinguishable | Yes |
| Receipt for both kinds | Yes |
| Payment against a long-term invoice | Yes |
| Prepaid payment for a short-term booking | Yes |
| Advance and deposit collection at lease start | Yes |
| Refunds | Yes — online refunds via provider; offline refunds recorded |
| Partial payments against an invoice | Yes |
| Automatic recurring charge (auto-debit) | No — V2 |
| Payment plans / installments beyond partial payment | No — V2 |
| Platform holding funds in escrow | **Never** — see [vision.md](vision.md#what-this-platform-is-not) |

## Money flows by rental path

The two rental lifecycles have different money shapes ([rental-lifecycle.md](rental-lifecycle.md)):

```
LONG-TERM                              SHORT-TERM
─────────                              ──────────

Lease signed                           Booking created
     │                                      │
     ▼                                      ▼
Advance + deposit                      Full amount, prepaid
₱8,500 + ₱17,000                       3 × ₱1,500 = ₱4,500
     │                                      │
     ▼                                      ▼
Move-in                                Reservation confirmed
     │                                      │
     ▼                                      ▼
Monthly invoice raised  ◀──┐           Stay
     │                     │                │
     ▼                     │                ▼
Payment (online/offline)   │           Checkout
     │                     │                │
     ▼                     │                ▼
Ledger + receipt           │           Completed
     │                     │
     └── next period ──────┘           No recurring claim.
                                       No deposit settlement in V1.
Lease ends
     │
     ▼
Deposit settlement
returned, or applied to
arrears / damages
```

The long-term path **chases money**: a claim is raised, and payment may or may not follow, on time or late. The short-term path **takes money up front**: no payment, no reservation. Nothing in the design should assume one shape covers both.

## An invoice is not money

Stated in [glossary.md](glossary.md#invoice) and repeated here because it is the most common modelling error in rental software:

| | Is | Is not |
|---|---|---|
| **Invoice** | A claim: "₱8,500 is owed by Sept 5" | Money |
| **Payment** | Money received | Proof the claim was correct |

An invoice may be partly paid, overpaid, paid late, waived, or never paid. A payment may arrive with no invoice yet raised. Modelling either as a field on the other destroys the ability to answer *"who actually owes us money right now?"* — the single question the owner most needs answered ([vision.md](vision.md#what-success-looks-like-for-the-pilot)).

## Who may do what

Full matrix in [roles-and-permissions.md](../01-product/roles-and-permissions.md). The product-level rules:

- **Tenants and Customers** pay online. They never record payments — a person cannot attest to their own cash.
- **Staff** may record offline payments. Every recording carries who recorded it, when, and against what.
- **Refunds** are a higher authority than recording a payment. Staff who can record cash cannot necessarily return it.
- **Nobody edits a ledger entry.** Corrections are new entries that reference the original. The ledger is append-only, and this is a product requirement, not just an implementation preference.

## Open questions

| # | Question | Owned by |
|---|---|---|
| [U-02](product-decisions.md#unresolved) | Is a deposit a payment against an invoice, or a held balance with its own lifecycle? | Step 2 |
| [U-04](product-decisions.md#unresolved) | Does a completed Stay leave any financial relationship behind? | Step 2 |

## Deliberately deferred to later steps

Which payment provider, how webhooks are verified, how idempotency keys are issued, how payment intents and attempts are modelled, how the ledger is stored, and how reconciliation runs — **none of that is decided here.** Provider abstraction will get its own ADR; the domain model gets Step 2. This document only fixes what must be true about money at the product level, so those later decisions have something to be correct against.
