# Money Model

> **Status:** Written
> **Owner step:** Step 2 — Domain Model
> **Last updated:** 2026-08-20
> **Depends on:** [payments-overview.md](../00-overview/payments-overview.md), [entities.md](entities.md), [state-machines.md](state-machines.md)
> **Informs:** [05-database](../05-database/) ledger schema, [07-integrations](../07-integrations/) payment provider, [08-security](../08-security/) audit

The domain shape of money. [payments-overview.md](../00-overview/payments-overview.md) settled what the platform *claims* about money; this document settles how it is *modelled*, and answers **[U-02](../00-overview/product-decisions.md#resolved-by-step-2)**.

---

## Four things, not one

The most common failure in rental software is one `payments` table doing four jobs. These are four different concepts with four different lifecycles:

| Concept | Is | Answers |
|---|---|---|
| **Invoice** | A claim | "What is owed?" |
| **Payment** | Money received | "What arrived?" |
| **Deposit Balance** | Money held and owed back | "What is ours to return?" |
| **Ledger Entry** | An immutable record of an event | "What happened, when, and who says so?" |

An invoice is not money. A payment is not proof the claim was right. A deposit is not revenue. And none of them is the ledger — the ledger is what remains true after all three have been argued about.

---

## Representation rules

Fixed here so no later step has to re-decide them:

| Rule | |
|---|---|
| **Amounts are integer minor units** — centavos | `₱8,500.00` is `850000`. No floating point may touch an amount, anywhere, at any layer |
| **Currency is `PHP`, and the field exists anyway** | D-02 means no multi-currency logic. The field costs nothing and prevents an ambiguous integer |
| **Amounts are never negative** | Direction is expressed by entry type, not by sign. A refund is a `REFUND` entry, not a negative payment |
| **Financial instants are `timestamptz` in UTC** | Unlike occupancy dates ([occupancy-model.md](occupancy-model.md#dates-versus-instants)). "When did the money arrive" is a moment |
| **`received_at` and `recorded_at` are separate fields** | Cash handed over Friday and entered Monday is two different facts, and the gap is exactly what audit looks at |

---

## Invoice

A claim by an Organization against a Tenant, for a period, with a due date. **Long-term only** — a prepaid Stay raises no invoice ([payments-overview.md](../00-overview/payments-overview.md#money-flows-by-rental-path)).

```
  Lease ACTIVE, billing day 5
        │
        ├── Sept: INV-2026-09-0142  ₱8,500  due Sept 5   ── PAID
        ├── Oct:  INV-2026-10-0142  ₱8,500  due Oct 5    ── PARTIALLY_PAID ₱4,000
        └── Nov:  INV-2026-11-0142  ₱8,500  due Nov 5    ── OVERDUE
```

**Line items** exist from V1, even though most invoices have exactly one. The lease-start invoice needs several:

| Line | Amount | Note |
|---|---|---|
| Advance rent (1 month) | ₱8,500 | Prepaid rent — an ordinary revenue line |
| Deposit (2 months) | ₱17,000 | **Not revenue.** Settling this line opens a Deposit Balance |
| September rent | ₱8,500 | |

That middle line is where U-02 becomes concrete.

**Rules:**

- `amount_paid` never exceeds `total` ([I-04](invariants.md#i-04--an-invoice-is-never-overpaid)). Money beyond the total is an unapplied credit, not an overpaid invoice.
- `OVERDUE` is derived from `due_date`, not a stored flag someone has to remember to set.
- An invoice issued in error is `VOIDED` with an opposing ledger entry. It is never deleted, and its number is never reused.
- Invoice numbers are per-Organization and gap-free. Owners are asked about gaps by their accountants.

---

## Payment

Money received. Two origins, permanently distinguishable (D-08, D-09).

```
   ONLINE                                OFFLINE_RECORDED
   ──────                                ────────────────
   origin        = ONLINE                origin        = OFFLINE_RECORDED
   provider_ref  = "pi_3Ox9..."          provider_ref  = null, forever
   recorded_by   = null                  recorded_by   = staff User (required)
   received_at   = provider timestamp    received_at   = when cash changed hands
   recorded_at   = same                  recorded_at   = when staff entered it
   evidence      = verifiable            evidence      = attestation

   States: INITIATED → PROCESSING →      State: RECORDED ∎
           SETTLED | FAILED
```

**Origin is set at creation and immutable.** No transition, no admin override, no data-fix script. It is the field every reconciliation, dispute, and audit report keys on ([payments-overview.md](../00-overview/payments-overview.md#why-this-matters-more-than-it-looks)).

**Application to claims is N:M.** One ₱17,000 payment may settle two invoices; one ₱8,500 invoice may take four partial payments. The application is its own record — payment, claim, amount applied, applied-at — because "which ₱4,000 settled what" is a question owners genuinely ask.

**A payment may exist with nothing to apply it to.** A tenant who pays early, before the invoice is raised, produces an unapplied credit that later invoices consume. Refusing that money is not an option, and modelling it as a negative invoice is a lie.

**Correcting an offline recording** creates a new opposing entry referencing the original, by a User with the authority to do it. `RECORDED` is terminal. This is the trust surface described in [product-scope.md](../00-overview/product-scope.md#risk-4--the-offline-payment-path-is-a-trust-surface), and an editable cash record would remove the only defence against it.

---

## Deposit as a held balance

> **[U-02](../00-overview/product-decisions.md#resolved-by-step-2) resolved: a deposit is a held balance with its own lifecycle — a liability the Organization owes back — not a payment against an invoice.**
>
> The V1 ledger therefore has a liability concept.

### Why

The alternative — treating the deposit as just another paid invoice line — is cheaper and breaks at exactly the moment it matters. At move-out the owner must answer:

- How much of this deposit is still ours to return?
- How much was applied to the September arrears, and how much to the broken door?
- What is the tenant owed today?

If the deposit was a paid invoice, those answers require reconstructing intent from unrelated records. And the money is *not the Organization's revenue* — it is the tenant's money, held. A model that books it as revenue on day one and quietly claws it back at move-out is misrepresenting the balance sheet for the entire lease term.

`₱17,000` and `₱8,500` arriving on the same day are not the same kind of money, and the model refuses to pretend otherwise.

### Shape

One Deposit Balance per Lease, opened when the deposit line is settled:

```
     Deposit Balance — Lease L-2026-0142
     ┌────────────────────────────────────────────────┐
     │  held        ₱17,000    ← opened at lease start│
     │  applied          ₱0                           │
     │  returned         ₱0                           │
     │  state        HELD                             │
     └────────────────────────────────────────────────┘
                        │
                 move-out inspection
                        ▼
     ┌────────────────────────────────────────────────┐
     │  held        ₱17,000                           │
     │  applied      ₱8,500  ← INV-2026-11 arrears    │
     │               ₱2,000  ← inspection finding #3  │
     │  returned     ₱6,500  ← to tenant              │
     │  state        SETTLED                          │
     └────────────────────────────────────────────────┘

     held = applied + returned, always ([I-06])
```

**Every application cites its cause** — an unpaid invoice, or a move-out inspection finding. A deduction with no cited cause is not expressible in the model. That single constraint is most of what makes deposit disputes survivable.

### Advance is not deposit

| | Advance | Deposit |
|---|---|---|
| Is | Prepaid rent | Money held against damage or arrears |
| Belongs to | The Organization, on receipt | The Tenant, until applied |
| Modelled as | An ordinary invoice line | A Deposit Balance |
| At lease end | Already consumed | Settled: applied and/or returned |

Both arrive in the same first payment. They are different money and stay different ([glossary.md](../00-overview/glossary.md#deposit)).

### Returning a deposit is not a refund

A Refund reverses a payment that was revenue. A deposit return releases money that was never revenue. Two entry types, two reports, two authorities. Conflating them makes an Organization's refund rate look alarming and its liabilities look absent.

### Short-term has no deposit in V1

No security deposit, no damage hold, no pre-authorization on nightly bookings ([rental-lifecycle.md](../00-overview/rental-lifecycle.md#path-b--short-term-stay)). A Stay's money is the prepayment, and it is fully consumed at booking.

---

## Ledger

The append-only record for an Organization. Both origins land here, tagged with which they were ([glossary.md](../00-overview/glossary.md#ledger)).

| Entry type | Raised by |
|---|---|
| `INVOICE_ISSUED` | An invoice reaching `ISSUED` |
| `INVOICE_VOIDED` | A void, referencing the original |
| `PAYMENT_RECEIVED` | Either origin, tagged |
| `PAYMENT_CORRECTED` | An opposing entry against a mistaken recording |
| `REFUND_ISSUED` | A refund |
| `DEPOSIT_HELD` | A Deposit Balance opening — **liability up** |
| `DEPOSIT_APPLIED` | A deduction, citing its cause — liability down, revenue up |
| `DEPOSIT_RETURNED` | A return — liability down |
| `BOOKING_PREPAID` | A short-term prepayment |

**Rules:**

1. **Append-only. No update path exists** — not for admins, not for support, not for migrations. Corrections are new, opposing entries referencing the original (D-08, and a product requirement, not an implementation preference).
2. **Every entry names its actor.** For online payments that is the provider; for offline recordings it is the staff User. "Who says so" is a column, not an inference.
3. **Every entry names its cause** — the invoice, payment, booking, or deposit balance it descends from.
4. **The ledger is the reconciliation surface, and only its `ONLINE` entries are reconcilable.** Offline entries have no provider side to compare against. A reconciliation that includes them never balances, and a reconciliation that never balances is one nobody reads ([payments-overview.md](../00-overview/payments-overview.md#why-this-matters-more-than-it-looks)).

### Not an accounting system

A permanent non-goal ([product-scope.md](../00-overview/product-scope.md#non-goals)). The ledger records rental money movements. It produces no statutory statements, computes no taxes (D-02), and is not double-entry bookkeeping. The deposit liability exists because *"what do we owe this tenant back"* is a rental question, not because V1 is growing a chart of accounts.

---

## The question the model exists to answer

From [vision.md](../00-overview/vision.md): an owner should be able to answer **"who owes me money this month?"** from the platform alone.

That is a query over Invoices in `ISSUED`, `OVERDUE`, or `PARTIALLY_PAID`, grouped by lease and tenant, with `total - amount_paid` as the balance. It is one query because invoices are claims and payments are money and neither is a field on the other.

The second question, asked once a year at every move-out — **"what is this tenant's deposit, and what happened to it?"** — is a Deposit Balance and its applications, each citing a cause. That one is answerable only because of U-02.
