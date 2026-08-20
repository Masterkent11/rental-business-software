# Tenant Web

> **Status:** Written
> **Owner step:** Step 3+ — Frontend
> **Last updated:** 2026-08-20
> **Depends on:** [web-toolchain.md](web-toolchain.md), [ADR-0010](../12-adr/0010-web-stack.md), [tenant/journey.md](../01-product/tenant/journey.md), [money-model.md](../03-domain/money-model.md)
> **Informs:** the owner and super admin web surfaces that reuse this shell

The web app for the **Tenant** surface. Lives at [`apps/tenant-web`](../../apps/tenant-web).

**The tenant surface is web, not Flutter** — decided deliberately, and the reasoning is in [ADR-0010](../12-adr/0010-web-stack.md).

---

## Same boundary as the customer app

Application code still runs ahead of Steps 4 and 5, so the same bargain applies as for [customer-app.md](customer-app.md):

| It may contain | It may not contain |
|---|---|
| Toolchain, routing, design system | Any domain rule from [03-domain](../03-domain/) |
| Screen shells reading in-memory fixtures | Balance or arrears computation |
| The status vocabulary the journey defines | API clients, persistence, auth |

**Balances arrive computed.** "What do I owe right now?" is answered by the server from the ledger. A client that re-derived it would be a second source of truth for the number the tenant most needs to trust.

---

## The screens

```
   Overview ──▶ Invoices ──▶ (pay)
      │
      ├──▶ Payments + documents
      ├──▶ Maintenance
      └──▶ Lease + deposit
```

| Screen | What it does |
|---|---|
| **Overview** | The single number — what you owe right now — with each claim behind it, an overdue callout naming the partial payment, the last payment with its recording gap, open maintenance, and lease summary |
| **Invoices** | Every period with claimed / received / still owed, a progress bar on partial payments, and waived invoices keeping their reason |
| **Payments** | Each payment with **money moved** and **recorded here** as separate facts, origin badge, receipt — plus the document library |
| **Maintenance** | A four-step tracker where acknowledgement is a step, not a footnote, with reopen on resolved requests |
| **Lease** | Term, rent, co-tenants, house rules, and the deposit as **held money with its own lifecycle** |

---

## Four things the screens say out loud

Each is a journey requirement a generic tenant portal would quietly drop.

### 1. One unambiguous number

The journey asks for "a single unambiguous answer to *what do I owe right now?*" — so ₱12,000 is the first thing on the page, at a size nothing competes with, with the two claims behind it listed underneath. Not a dashboard of five metrics.

### 2. Partial payment is shown as partial

A tenant who paid ₱5,000 of ₱8,500 sees exactly that, and the ₱3,500 that remains. Never "unpaid" — that label is how a tenant loses track of their own money, and partial payment is common here, not an edge case.

### 3. The recording gap is visible

The most sensitive state in the product is cash handed over that the app does not yet show. Every payment carries **when the money moved** and **when it was recorded**, as separate fields. For an online payment they are the same instant. For cash they are not — 38 hours, in the sample data — and showing both is what turns a mysterious delay into an ordinary one.

The receipt copy is honest without being alarming: *the platform did not process this money; Marco Diaz confirmed receiving it.* And the tenant is told plainly that they cannot record their own payment, because a person cannot attest to their own cash.

### 4. The deposit is the tenant's money, held

[U-02](../03-domain/money-model.md#deposit-as-a-held-balance) made concrete: held, applied, returned, each shown separately, with the promise that any deduction must cite an unpaid invoice or a specific inspection finding.

Deposit settlement is the last impression the product makes, and an unexplained deduction is the classic Philippine rental dispute. The shape that supports an itemised settlement is used from the first build, not retrofitted at move-out.

---

## Design

Shares the mobile app's language by value: the same warm neutrals, near-black ink, and single amber accent, expressed as Tailwind v4 tokens in `app/globals.css`. Four semantic tokens carry meaning rather than colour — `money`, `ok`, `bad`, `pending` — so a status is never a hard-coded hex.

shadcn/ui with the radix base, components copied into the repo and restyled to those tokens.

Desktop gets a persistent rail; mobile gets a bottom bar. The journey calls tenant mobile the primary surface and web the place for documents and desktop use, so neither is the afterthought.

---

## Running it

```bash
cd apps/tenant-web && npm run dev
```

Verified: `typecheck` clean, `lint` clean, production build clean, all five routes prerendering, walked end to end in a browser.

Note that port 3000 is occupied by another project on this machine — use `npm run dev -- --port 3100` if that is still true.

---

## Next

1. **After Step 5:** replace `lib/fixtures.ts` with generated clients against real contracts. The types are designed to be deleted.
2. **Then:** the owner and super admin web surfaces reuse this shell, tokens, and status vocabulary.
3. **Not yet:** authentication, real payments, file downloads — all wait on Steps 3's identity work landing in code and Step 5's contracts.
