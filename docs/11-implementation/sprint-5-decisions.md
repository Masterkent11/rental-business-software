# Sprint 5 — decisions taken without a written source

> **Status:** Written (Sprint 5)
> **Last updated:** 2026-08-23
> **Wants:** review, and a decision on each

Sprint 5 asked for "applications and reservations (D-28)". Four things had to be
settled that no document answers. They are recorded here rather than buried in
code, because each is a product decision wearing implementation clothes.

## 1. D-28 does not exist

`mvp-roadmap.md` cites **D-28** for this sprint's goal. It appears nowhere else
in `docs/` — not in `product-decisions.md`, not in the glossary. The work was
built from the story text plus [entities.md](../03-domain/entities.md), which
does describe applications and is unambiguous about the rule that matters.

**Needed:** either write D-28 down, or drop the citation.

## 2. Who sets the reservation fee

Nothing says. The options were a platform rule (say, one month's rent) or an
owner-set amount.

**Taken:** owner-set, per listing, nullable, and reservations are refused where
no fee is set — *"This owner does not offer reservations on this place."*

A platform rule would mean the platform pricing an owner's inventory and then
**forfeiting that money on their behalf** when a customer withdraws. That is a
commercial decision belonging to the owner.

The cost: reservations are invisible until an owner opts in, and nothing in the
owner web yet lets them. Setting the fee is currently a database change.

## 3. Two new ledger entry types

[money-model.md](../03-domain/money-model.md#ledger) fixes the entry-type
vocabulary. Story 5.4 requires three fee outcomes, and only one of them fits:

| Outcome | Entry used | Why |
|---|---|---|
| Refunded on rejection | `REFUND_ISSUED` | Existing, exact |
| Credited on approval | **`RESERVATION_FEE_CREDITED`** *(new)* | Not a refund and not revenue — a claim the tenant holds against their first invoice |
| Forfeited on withdrawal | **`RESERVATION_FEE_FORFEITED`** *(new)* | Becomes the owner's money. Recording it as a plain `PAYMENT_RECEIVED` would lose *why*, and the why is what a customer disputes |

**Taken:** add both. This is a real extension to the domain vocabulary and is
the item on this page most in need of sign-off.

## 4. Approval places a hold — 72 hours

[entities.md](../03-domain/entities.md#application) says an application places
no hold and *"approval is what takes it off the market"*. The owner screen says
the same to the owner: held for 72 hours while the applicant pays.

The code did neither. Approving an application with no reservation fee placed
**nothing**, so an approved unit stayed rentable by somebody else — the document
and the screen agreed with each other and disagreed with the software.

**Taken:** approval places a `LEASE`/`HELD` occupancy for the intended tenancy,
expiring in 72 hours. The exclusion constraint makes the refusal trustworthy: an
approval whose term overlaps an existing booking or lease fails with **409** and
the conflict named, at decision time.

Where a paid reservation already holds the place, that occupancy is committed
instead — there is no second hold to place.

## What is deliberately not built

- **Owner-facing fee configuration.** See 2.
- **Expiry of the 72-hour hold.** Nothing sweeps it yet; the timestamp is
  correct and enforced on read, as with reservation expiry.
- **The move-in payment.** Approval opens the window; paying the advance and
  deposit within it is Sprint 6's, along with the lease itself.
- **Document review in the owner web.** The count shows; the signed URLs are
  issued by the API but no owner screen opens them yet.
