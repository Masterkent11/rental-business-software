# Hexagonal Architecture

> **Status:** Written
> **Owner step:** Step 3 — Architecture
> **Last updated:** 2026-08-20
> **Depends on:** [architecture-principles.md](architecture-principles.md), [03-domain](../03-domain/)
> **Informs:** [11-implementation](../11-implementation/), [10-testing](../10-testing/)

Ports and adapters, and specifically how the domain stays independent of Supabase.

This is not a style preference. [ADR-0001](../12-adr/0001-supabase-api-mediated.md) accepts Supabase **on the explicit condition that it can be replaced**, and that condition is only met if the coupling is narrow enough to count. This document is where it gets counted.

---

## The layers

```
        ┌──────────────────────────────────────────────┐
        │              DRIVING ADAPTERS                │
        │   HTTP routes · background jobs · CLI        │
        └───────────────────┬──────────────────────────┘
                            │ calls
                            ▼
        ┌──────────────────────────────────────────────┐
        │               APPLICATION                    │
        │   use cases · transactions · authorization   │
        │   defines the PORTS below                    │
        └───────────────────┬──────────────────────────┘
                            │ uses
                            ▼
        ┌──────────────────────────────────────────────┐
        │                 DOMAIN                       │
        │   entities · invariants · state machines     │
        │   Step 2, in code. Imports nothing.          │
        └──────────────────────────────────────────────┘
                            ▲
                            │ implements ports
        ┌───────────────────┴──────────────────────────┐
        │              DRIVEN ADAPTERS                 │
        │   postgres · auth · storage · payments ·     │
        │   notifications · clock                      │
        └──────────────────────────────────────────────┘

   Dependencies point INWARD. The domain names what it needs;
   the outside supplies it.
```

| Layer | May import | May never import |
|---|---|---|
| Domain | Nothing but the language and its own shared kernel | Anything with a network, a driver, or a framework |
| Application | Domain, port interfaces | Concrete adapters, HTTP types, SQL |
| Driving adapters | Application | Domain internals, driven adapters |
| Driven adapters | Domain types, port interfaces | Application use cases |

The rule is checked by a lint boundary rule, not by discipline. A rule enforced only by review is a rule that has already been broken somewhere.

---

## The ports

Every one of these is an interface the **application** owns and the outside implements. This list is the whole surface between the product and its platform.

| Port | Responsibility | V1 adapter |
|---|---|---|
| `ResourceRepository` | Rentable resources and their occupancy timeline | PostgreSQL |
| `ListingRepository` | Listings and their approval state | PostgreSQL |
| `LeaseRepository` | Leases, tenants, deposit balances | PostgreSQL |
| `BookingRepository` | Bookings and stays | PostgreSQL |
| `LedgerRepository` | Append-only financial entries | PostgreSQL, `INSERT`-only role |
| `AuditLog` | Who did what, when | PostgreSQL, `INSERT`-only role |
| `UnitOfWork` | Transaction boundary and isolation level | PostgreSQL |
| `IdentityProvider` | Verify a token, return a user id | Supabase Auth |
| `FileStore` | Put, read, and sign URLs for media and documents | Supabase Storage |
| `PaymentGateway` | Start an online payment, confirm it, refund it | Provider ([ADR-0008](../12-adr/0008-payment-provider-port.md)) |
| `Notifier` | Push, email, SMS | Provider |
| `Clock` | Now, in UTC | System |

**`Clock` is a port for a reason.** Hold expiry, invoice due dates, lease ends, and the recorded-versus-received gap are all time-dependent domain rules. A domain that reads the system clock directly cannot be tested for any of them, and those are exactly the rules that are expensive to get wrong.

### What is not a port

`OccupancyOverlapChecker` is deliberately **not** a port. Overlap is enforced by a database exclusion constraint ([ADR-0005](../12-adr/0005-occupancy-write-serialization.md)), so the check is a property of the write, not a service the application calls. A port here would invite a second, weaker check in application code that appears to work and does not hold under concurrency.

This is the general shape of the exception: **when correctness comes from the storage engine, do not model it as something swappable.** The adapter must reject the write; a different database would have to reject it too.

---

## What the domain looks like

The domain is plain TypeScript. No decorators, no base classes from a framework, no ORM entities.

```
domain/
  shared/           Money · DateRange · OrganizationId · Result
  occupancy/        Occupancy · Firmness · overlap rules
  inventory/        RentableResource · RentalMode · pricing
  listings/         Listing · approval state machine
  leasing/          Lease · Tenant · DepositBalance
  staying/          Booking · Stay · Guest
  billing/          Invoice · Payment · LedgerEntry
  operations/       MaintenanceRequest · MoveOutInspection
```

Two properties matter more than the folder names:

1. **State machines are exhaustive and total.** Every transition in [state-machines.md](../03-domain/state-machines.md) is a function that either returns the next state or a typed refusal. There is no `setState`, and an illegal transition is unrepresentable rather than validated against.
2. **Invariants are constructors.** A `DepositBalance` that does not satisfy `held = applied + returned` ([I-06](../03-domain/invariants.md#i-06--deposit-arithmetic-always-balances)) cannot be constructed. Validation that runs after an object exists is a check that can be skipped.

---

## Where the mapping happens

Adapters own the translation, in both directions, and the domain never sees a row.

```
   Postgres row  ──▶  adapter mapping  ──▶  domain object
   { organization_id, starts_on, ends_on, firmness, cause_type }
                                    │
                                    ▼
                    Occupancy.rehydrate({ ... })
```

The application layer works only in domain types. HTTP payload shapes live in the transport adapter and are validated at the edge; a use case never receives an unvalidated request body.

---

## What this buys, and what it costs

**Buys:**

- The domain is testable with no database, no HTTP, and no Supabase — which makes the Step 2 invariants directly testable as unit tests rather than as integration tests nobody runs.
- Replacing Supabase is four adapter rewrites, not a rebuild.
- Background jobs and HTTP routes call the same use cases, so an invoice raised by a job and one raised by an admin follow identical rules.

**Costs, stated plainly:**

- More files, and more indirection than calling the SDK from a route. Roughly twice the code for simple CRUD paths.
- A real temptation, on any given afternoon, to "just query it here". That temptation is why the boundary is lint-enforced.
- Mapping code that has to stay in sync with the schema.

The trade is deliberate. This is a documentation-first project whose stated position is that the domain model is the expensive thing to get wrong — an architecture that lets the platform dictate the model would contradict the reason the model was written first.
