# Architecture Principles

> **Status:** Written
> **Owner step:** Step 3 — Architecture
> **Last updated:** 2026-08-20
> **Depends on:** [03-domain](../03-domain/)
> **Informs:** every ADR, every implementation phase

Non-negotiable engineering rules. Each exists because a Step 1 or Step 2 decision would otherwise be unenforceable.

A principle without a consequence is a slogan, so each states what it costs.

---

## P-01 — The domain does not know what a database is

The domain layer imports nothing from Supabase, Postgres, HTTP, or any SDK. It expresses rules in its own vocabulary — Occupancy, Lease, DepositBalance, Money — and depends only on interfaces it defines itself.

**Why:** the platform choice is explicitly temporary ([ADR-0001](../12-adr/0001-supabase-api-mediated.md)). Supabase is the fastest way to a pilot, and the domain must survive its replacement without a rewrite.

**Cost:** more indirection than calling the SDK from a route handler. Accepted knowingly — it is the whole reason the platform decision was affordable.

---

## P-02 — Only the API writes domain state

No client — Flutter, Next.js, or otherwise — writes to the database. Not through the Supabase SDK, not through RLS-permitted inserts, not "just for favourites".

**Why:** [I-01](../03-domain/invariants.md#i-01--no-overlapping-committed-occupancy) needs a serialized write path, [I-10](../03-domain/invariants.md#i-10--the-ledger-and-audit-log-are-append-only) needs an append-only guarantee, and [I-06](../03-domain/invariants.md#i-06--deposit-arithmetic-always-balances) needs arithmetic no RLS policy can express. A second writer defeats all three.

**Cost:** the fastest Supabase workflow — client SDK straight to Postgres — is off the table. That speed was bought with correctness we cannot spend.

---

## P-03 — Isolation is enforced twice, independently

Every Organization-scoped query is scoped in the application layer **and** protected by a row-level security policy that would still hold if the application layer were wrong.

**Why:** a single mechanism has a single failure mode, and the failure mode here is one Organization reading another's tenants, leases, and money.

**Cost:** duplicated intent, and a class of bug where the two disagree and a legitimate query returns nothing. Preferable to the alternative failure.

---

## P-04 — Invariants live where they can be enforced synchronously

Anything [invariants.md](../03-domain/invariants.md) marks as aggregate-enforced happens inside one transaction, inside one aggregate boundary. Nothing that must be true is left to a background job, a trigger chain, or a retry.

**Cost:** some operations hold a transaction longer than a purely eventual design would. Named and measured, not hidden — see [ADR-0005](../12-adr/0005-occupancy-write-serialization.md).

---

## P-05 — Derived data is derived, and says so

Availability projections, balances, and search indexes are caches. Each has one source of truth, one rebuild path, and a name that makes its status obvious. **If a projection disagrees with its source, the source is right and the projection is rebuilt.**

**Why:** [occupancy-model.md](../03-domain/occupancy-model.md#consequence-for-reads) fixed this. A cache that can be argued with is not a cache.

**Cost:** every projection needs a rebuild command, and the rebuild has to be cheap enough to actually run.

---

## P-06 — Money is integer minor units, end to end

Centavos as integers in the domain, in the database, in the API payloads, and in both clients. No floating point touches an amount at any layer, including JSON.

**Cost:** every client formats for display. Already done once in each — [`Money`](../../apps/customer_app/lib/design/money.dart) in Flutter, its counterpart on the web.

---

## P-07 — Evidence is never inferred

Payment origin, who recorded an offline payment, when cash arrived versus when it was entered, who approved a listing, who read another Organization's data — all stored explicitly at the moment they happen. None is reconstructed later from timestamps or actor tables.

**Why:** D-09 and [I-08](../03-domain/invariants.md#i-08--payment-origin-is-immutable). The offline payment path is the product's trust surface and its only defence is a record made at the time.

---

## P-08 — Corrections are additive

Nothing financial or auditable is updated or deleted. Mistakes are corrected by new, opposing entries that reference the original. This is enforced by database permissions, not by convention: the writing role holds `INSERT` on those tables and nothing else.

**Cost:** more rows, and reports must always aggregate rather than read a current value. That is the shape the ledger has anyway.

---

## P-09 — The two rental paths share the timeline and nothing else

Long-term and short-term meet at Occupancy. Above it — pricing, screening, money, lifecycle — they stay separate, with no shared abstraction invented to make them look alike.

**Why:** [rental-lifecycle.md](../00-overview/rental-lifecycle.md) is explicit that treating short-term as a special case of long-term produces a model that lies. An architecture that unifies them re-introduces exactly that.

**Cost:** duplication that looks removable and is not. Reviewers will propose collapsing it roughly annually.

---

## P-10 — Every surface is a client of the same API

The Flutter customer app, the tenant web app, owner web, and super admin web all call the same versioned API. No surface gets a private back door, and no business rule lives in a client.

**Cost:** the API must serve read shapes that suit very different screens, which pushes work into query design rather than into clients. That is the correct place for it.

---

## P-11 — Nothing is built for a market we do not have

PHP only, PH addresses, PH payment rails (D-02, D-25). No currency abstraction, no locale strategy, no country tables. When a second market arrives it is a deliberate re-scoping, and the cost of that is accepted in advance.

---

## P-12 — Platform features are used through ports, not embraced

Supabase Auth, Storage, and Postgres are reached through interfaces the domain owns. Realtime, Edge Functions, and PostgREST are not used for domain state at all.

**Why:** the migration path stays real only if the coupling stays shallow. A platform used through four narrow ports is replaceable; a platform used everywhere is the architecture.

**Cost:** some Supabase conveniences go unused. That is the price of the option to leave.
