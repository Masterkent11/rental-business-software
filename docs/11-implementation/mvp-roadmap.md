# Customer App MVP — Sprint Roadmap

> **Status:** Written
> **Owner step:** Step 6 — Implementation
> **Last updated:** 2026-08-21
> **Depends on:** [03-domain](../03-domain/), [02-architecture](../02-architecture/), [12-adr](../12-adr/)
> **Informs:** every sprint from here to MVP

How the customer app gets from three UI shells to a working product, in increments that each end in something demonstrable.

---

## What MVP means here

**A real customer, on a real phone, finds a real place and commits to it — with money moving and the owner seeing it.**

Concretely, one person can:

1. Search published listings and see honest availability.
2. Walk a virtual tour.
3. Book a nightly stay, pay, and get a confirmation they can show at the door.
4. Apply for a monthly rental, or reserve one with a fee (D-28).
5. Sign in once and keep the same account throughout (D-15).

Everything else is after MVP.

### Out of the MVP cut line

| Deferred | Why |
|---|---|
| Owner and tenant surfaces beyond what the customer flow needs | Those apps exist as shells; they are not on this critical path |
| Offline payment recording | Staff-facing (D-08). The customer never records cash |
| Maintenance, invoices, leases | Tenant lifecycle. A customer becomes a tenant *after* MVP |
| Push notifications | In-app list is enough to demonstrate the loop |
| Search ranking (`Popular` / `Nearby`) | Ships as a stubbed ordering until there is behaviour to rank on |

---

## The sequencing problem, stated

The project is documentation-first, and **Steps 4 (database) and 5 (API contracts) are not written**. Agile does not excuse skipping them — the domain model is the expensive thing to get wrong, and that is precisely why it was written before any code.

The resolution is not to skip them but to **slice them**. Each sprint writes only the schema and only the contract that its own stories need:

```
   BIG-BANG (rejected)              SLICED (chosen)

   Step 4: whole schema             S1: listings + resources schema
   Step 5: whole OpenAPI                + the three endpoints it needs
   Step 6: build everything         S2: identity schema + auth contract
                                    S3: occupancy schema + booking contract
   Nothing demonstrable             ...
   for months                       Each sprint ends in a demo
```

Every sprint therefore has a **docs deliverable**, and it is part of the Definition of Done, not a follow-up.

---

## Sprint 1 — The pipe

**Goal:** one listing, fetched from a real database, rendered by the real app. No fixtures on the discovery path.

This is the thinnest slice that proves every layer exists: Postgres → repository → use case → route → HTTP → Flutter. Everything after it is filling in.

| # | Story | Done when |
|---|---|---|
| 1.1 | API service skeleton | `apps/api` runs, hexagonal layers enforced by lint, `/health` returns 200 |
| 1.2 | Supabase local + first migration | `organizations`, `properties`, `rentable_resources`, `listings`, `media` exist with `organization_id` on every row and RLS enabled |
| 1.3 | Seed data | The three sample properties from the fixtures exist as real rows |
| 1.4 | `GET /listings`, `GET /listings/{id}` | Returns published listings only. Filters: kind, type, price, has-tour |
| 1.5 | Flutter API client | Discovery and listing detail read from the API. `SampleData` no longer imported by those screens |
| 1.6 | Docs | `05-database/schema.md` for these tables · `04-api/README.md` + OpenAPI for these endpoints |

**Demo:** change a price in the database, pull to refresh, see it in the app.

**Risk:** Docker is not currently running on this machine, so the Supabase local stack cannot start. Story 1.2 is blocked until it is.

---

## Sprint 2 — Identity

**Goal:** the same account, for life (D-15).

| # | Story | Done when |
|---|---|---|
| 2.1 | Supabase Auth wired | Email+password and mobile OTP; sessions in the keychain |
| 2.2 | Capabilities resolved server-side | Every request loads capabilities from the database, never from token claims ([ADR-0007](../12-adr/0007-identity-and-sessions.md)) |
| 2.3 | Account screen becomes real | Sign in, sign out, profile |
| 2.4 | Saved listings persist | Favourites move from memory to the user |
| 2.5 | Docs | `08-security/authn.md`, identity tables in `05-database` |

**Demo:** sign in on one device, see your saved listings on another.

---

## Sprint 3 — Availability and booking

**Goal:** the invariant the platform exists to keep, running for real.

The hardest sprint. [I-01](../03-domain/invariants.md#i-01--no-overlapping-committed-occupancy) and [ADR-0005](../12-adr/0005-occupancy-write-serialization.md) land here together.

| # | Story | Done when |
|---|---|---|
| 3.1 | Occupancy table + exclusion constraint | `EXCLUDE` over resource path and date range; `btree_gist` enabled |
| 3.2 | Availability projections | `resource_night_status` maintained in the write transaction ([ADR-0004](../12-adr/0004-availability-projection.md)) |
| 3.3 | `GET /resources/{id}/availability` | The booking calendar shows real blocked nights |
| 3.4 | `POST /bookings` places a hold | Serializable transaction, advisory lock on the resource root, 60-minute expiry |
| 3.5 | Concurrency test | Two simultaneous bookings for the same night: one wins, one gets a 409 with the conflict |
| 3.6 | Docs | `05-database/occupancy.md`, booking endpoints in `04-api` |

**Demo:** two phones, same nights, same second. One booking, one honest refusal.

**This sprint is not done without story 3.5.** A double-booking that only appears under load is the failure this whole architecture was designed to prevent.

---

## Sprint 4 — Money

**Goal:** a booking someone actually paid for.

| # | Story | Done when |
|---|---|---|
| 4.1 | `PaymentGateway` port + sandbox adapter | No provider name in the domain ([ADR-0008](../12-adr/0008-payment-provider-port.md)) |
| 4.2 | Payment intent from a held booking | Hold survives until paid or expired |
| 4.3 | Webhook confirms, idempotently | Replayed webhooks apply once. Hold → committed, stay created |
| 4.4 | Ledger, append-only | `INSERT`-only role. `BOOKING_PREPAID` entries |
| 4.5 | Booking detail shows the real receipt | Reference, dates, what was paid |
| 4.6 | Docs | `07-integrations/payments.md`, ledger schema |

**Demo:** pay in the sandbox, watch the booking confirm without anyone touching it.

---

## Sprint 5 — The long-term path

**Goal:** applications and reservations (D-28).

| # | Story | Done when |
|---|---|---|
| 5.1 | Applications with document upload | Signed URLs, private bucket, PH IDs never public |
| 5.2 | Application status tracking | The screen built in the shell reads real state |
| 5.3 | Reservation fee places a `HELD` occupancy | Cause `RESERVATION`, 7-day expiry |
| 5.4 | Fee outcomes | Credited on approval, refunded on rejection, forfeited on withdrawal |
| 5.5 | Owner decides | Minimum owner-web screen to approve or reject — the customer flow is untestable without it |
| 5.6 | Docs | Application and reservation contracts |

**Demo:** apply, reserve, get approved from the owner app, see it change on the phone.

---

## Sprint 6 — The differentiator

**Goal:** tours that load on a mid-range phone over mobile data.

| # | Story | Done when |
|---|---|---|
| 6.1 | Panorama upload + tiling worker | [ADR-0009](../12-adr/0009-media-pipeline.md). Processing state is domain-visible |
| 6.2 | Tour read API | Scenes and hotspots for a resource |
| 6.3 | Real 360° viewer in Flutter | Replaces the flat-photo stand-in |
| 6.4 | Performance gate | Preview visible under 2s on a mid-range Android over throttled 4G |
| 6.5 | Owner authoring writes through | The studio saves to the API |
| 6.6 | Docs | `07-integrations/media.md` updated with what shipped |

**Demo:** an owner authors a tour; a customer walks it on a phone on mobile data.

**Story 6.4 is a gate, not a metric.** [product-scope.md](../00-overview/product-scope.md#risk-2--virtual-tour-on-the-critical-path) is explicit that a weak viewer makes the feature decorative — which is exactly what deferring it would have meant.

---

## MVP

After Sprint 6, the pilot definition in [product-scope.md](../00-overview/product-scope.md#pilot-definition) is testable end to end.

## Definition of Done

A story is done when **all** of these hold. Not four of five.

- [ ] `flutter analyze` and the API's lint and typecheck are clean
- [ ] Tests exist for the behaviour, including its refusal case
- [ ] Every Organization-scoped read has a cross-organization test ([multi-tenancy.md](../02-architecture/multi-tenancy.md#how-this-is-tested))
- [ ] Every use case has a negative authorization test ([authorization.md](../02-architecture/authorization.md#testing-obligation))
- [ ] The docs the sprint owes are written, not deferred
- [ ] It runs against the real database, not fixtures
- [ ] It is demonstrable to someone who did not build it

## Working agreement

- **Fixtures are deleted as they are replaced**, never left alongside real data. Two sources of truth for the same screen is how a demo passes and production does not.
- **No story is "done, pending the backend."** A story spans the stack or it is two stories.
- **The domain never bends to the schema.** If an implementation disagrees with [03-domain](../03-domain/), the document is amended deliberately and recorded in the register — or the implementation is wrong.
