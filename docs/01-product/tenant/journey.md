# Tenant Journey

> **Status:** Written
> **Owner step:** Step 1 — Product Definition
> **Last updated:** 2026-08-18
> **Depends on:** [personas.md](../../00-overview/personas.md), [payments-overview.md](../../00-overview/payments-overview.md)
> **Informs:** tenant mobile and tenant web scope, [roles-and-permissions.md](../roles-and-permissions.md)

**Actor:** Tenant — a person occupying a rentable resource under a lease. Nothing else ([glossary.md](../../00-overview/glossary.md#the-tenant-rule)).
**Primary surface:** Tenant mobile app. Tenant web for documents and desktop use.

A Tenant is a **distinct actor from an Owner** (D-16) and shares no journey with one.

---

## Where this journey begins

The tenant arrives from [customer/journey.md](../customer/journey.md) — same account, tenant capabilities added (D-15). They may still be a Customer at the same time. Nothing was re-registered.

Short-term guests never reach this journey. A stay creates no lease and no tenant ([rental-lifecycle.md](../../00-overview/rental-lifecycle.md#path-b--short-term-stay)).

---

## The recurring shape of tenant life

Unlike the customer journey, this one is a **loop**, not a funnel:

```
Move-in
   │
   ▼
┌──────────────── every period ────────────────┐
│                                              │
│   Invoice appears     ₱8,500, due Sept 5     │
│         │                                    │
│         ▼                                    │
│   Pay  ──┬── online (GCash / Maya / card)    │
│          └── cash to staff, they record it   │
│         │                                    │
│         ▼                                    │
│   Receipt + ledger entry                     │
│                                              │
│   Maintenance requests, any time             │
│                                              │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
          Approaching lease end
                   │
          ┌────────┴────────┐
          ▼                 ▼
       Renewal          Move-out
                            │
                            ▼
                   Deposit settlement
```

---

## Stage 1 — Move-in

| | |
|---|---|
| **Sees** | Their lease: term, rent, deposit and advance paid, conditions, house rules |
| **Has** | Receipts for what they already paid; a copy of the lease document |
| **Needs** | To know what happens next, and when the first invoice arrives |

**A tenant must always be able to see their own lease.** Not having a copy of your own rental agreement is one of the concrete pains this product exists to fix ([personas.md](../../00-overview/personas.md#tenant)).

## Stage 2 — Invoices

| | |
|---|---|
| **Sees** | Current balance, this period's invoice, due date, and history |
| **Needs** | A single unambiguous answer to "what do I owe right now?" |

An invoice is a **claim, not money** ([payments-overview.md](../../00-overview/payments-overview.md#an-invoice-is-not-money)). The tenant view must distinguish:

| State | Means |
|---|---|
| Due | Raised, not yet paid |
| Partially paid | Some received, balance outstanding |
| Paid | Settled in full |
| Overdue | Past due date, unpaid |
| Waived | Cancelled by the owner, with a reason |

Partial payment is supported in V1 and is common — a tenant paying ₱5,000 now and ₱3,500 on payday must see exactly that, not an unhelpful "unpaid".

## Stage 3 — Paying rent

Two paths, both first-class (D-08), and the tenant sees the same outcome from either.

### Online

```
Tenant → pays in app → GCash / Maya / Card → confirmed → ledger → receipt
```

| | |
|---|---|
| **Does** | Pays from the app against a specific invoice |
| **Sees** | Immediate confirmation and a receipt |
| **Needs** | To know it worked, without asking anyone |

### Cash to staff

```
Tenant → hands ₱8,500 cash to staff → staff records it → ledger → receipt
```

| | |
|---|---|
| **Does** | Pays a caretaker or manager in person, as they always have |
| **Sees** | The payment appear in the app, and a receipt |
| **Needs** | It recorded promptly — and to be able to see when it was recorded and by whom |

**This is the trust feature of the entire product.** For a tenant like Ana who pays cash on night shift, the app showing "₱8,500 received Sept 3, recorded by Marco" is the difference between a system she trusts and one she ignores.

**What the tenant must understand:** the platform did not process this money — it recorded that staff received it (D-09). The receipt should be honest about that without being alarming.

**What the tenant can never do:** record their own payment. A person cannot attest to their own cash.

**The gap that must be visible:** between handing over cash and staff recording it, the app still shows an outstanding balance. The tenant should be able to see when a payment was recorded, so a delay is visible rather than mysterious.

## Stage 4 — Receipts and documents

| | |
|---|---|
| **Has** | A receipt per payment — online or recorded; the lease; move-in documents; notices sent |
| **Needs** | To retrieve proof months later, without asking the owner |

The whole point is that "did I pay last month?" stops being an argument and becomes a lookup.

## Stage 5 — Maintenance

| | |
|---|---|
| **Does** | Reports an issue with a description and photos — *"kitchen faucet leaking"* |
| **Sees** | Status: submitted → acknowledged → in progress → resolved → closed |
| **Needs** | Confirmation someone saw it, and progress they did not have to chase |

The pain being solved is a request lost in a group chat. **Acknowledgement matters as much as resolution** — an unacknowledged request feels ignored even when work has started.

The tenant can reopen a request they consider unresolved.

Whether short-term guests may raise maintenance requests is [U-05](../../00-overview/product-decisions.md#unresolved).

## Stage 6 — Notifications

| Notified about | Why |
|---|---|
| New invoice raised | So the tenant is never surprised |
| Payment received (both kinds) | Closes the loop, especially for cash |
| Payment overdue | A reminder, before it becomes a conflict |
| Maintenance status changes | Progress without chasing |
| Lease approaching end | Time to decide on renewal |
| Notices from the owner | Rental-context communication |

The bar: **a tenant should never be chased for something they were not told about.**

## Stage 7 — Renewal or move-out

### Renewal

| | |
|---|---|
| **Sees** | Lease end date approaching, with renewal terms |
| **Does** | Requests renewal; the owner confirms; a new term begins |

### Move-out

| | |
|---|---|
| **Does** | Gives notice per the lease terms |
| **Then** | Move-out inspection → deposit settlement |
| **Sees** | What was returned, what was deducted, and why |

**The deposit settlement is the last impression the product makes.** An unexplained deduction is the classic PH rental dispute, and an itemized, documented settlement is how the platform earns trust at exactly the moment it is most at risk.

Whether a deposit is a payment against an invoice or a held balance with its own lifecycle is [U-02](../../00-overview/product-decisions.md#unresolved).

After move-out the tenant keeps access to their history — receipts, lease, settlement — and retains their Customer capabilities to find their next place.

---

## What the tenant can never do

| Cannot | Why |
|---|---|
| Record their own payment | Cannot attest to their own cash (D-09) |
| Edit an invoice or a ledger entry | The ledger is append-only |
| See other tenants' data | Privacy, including co-tenants' personal details |
| Edit their own lease | It is an agreement, not a form |
| Delete a maintenance request | Operational record — they can close or reopen it |

---

## States the app must handle

- **No invoice yet.** New tenant, before the first billing period. Show what is coming, not an empty screen.
- **Overdue balance.** Clear, actionable, not shaming. Show what is owed and how to pay.
- **Cash paid but not yet recorded.** The most sensitive state in the product — the tenant paid and the app disagrees. Make recording latency visible and provide a way to raise it.
- **Partial payment.** Show the remaining balance explicitly.
- **Lease ending soon.** Surface it early enough to act on.
- **Lease ended, deposit pending.** A real waiting state that must not look like an error.
- **Tenant of one place, customer for another.** Both capability sets, clearly separated (D-15).
