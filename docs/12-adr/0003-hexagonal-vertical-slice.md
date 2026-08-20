# ADR-0003 — Hexagonal core with vertical feature slices

**Status:** Accepted · **Date:** 2026-08-20 · **Deciders:** Step 3

## Context

Step 2 produced a domain model deliberately ahead of any technology, on the stated basis that the domain is the expensive thing to get wrong. Step 3 chose a platform it wants to keep replaceable ([ADR-0001](0001-supabase-api-mediated.md)).

Both only hold if the domain is expressible in code without the platform leaking into it.

## Decision

**Hexagonal for direction, vertical slices for grouping.**

- The domain layer imports nothing external and defines the ports it needs — twelve of them ([hexagonal-architecture.md](../02-architecture/hexagonal-architecture.md)).
- Features are grouped by what an actor is doing, not by technical layer ([vertical-slice.md](../02-architecture/vertical-slice.md)).
- A small shared kernel holds the domain, the ports, and transaction plumbing.
- Layer boundaries are enforced by a lint rule, not by review.

## Consequences

**Good**

- The Step 2 invariants become unit tests with no database, so they are actually written.
- Replacing Supabase is four adapter rewrites.
- `record-offline-payment` and `pay-online` are separate slices, so D-09's distinction is structural rather than a flag on a shared code path.

**Bad, accepted**

- Roughly twice the code for simple CRUD, and more indirection than calling the SDK from a route.
- Mapping code between rows and domain objects that must be kept in sync.
- A standing temptation to shortcut, which is why the boundary is lint-enforced rather than trusted.

## Alternatives

| Rejected | Why |
|---|---|
| **Layered (controllers / services / repositories)** | One feature change touches three folders and risks four features. Nothing keeps the platform out of the middle layer |
| **Active record / ORM entities as the domain** | The domain would be defined by table shape, inverting the whole point of writing Step 2 first |
| **Slices with no shared domain** | Two slices disagreeing about what "occupied" means is a double-booked bed space |

## Revisit when

The indirection is measurably slowing delivery on slices with genuinely no domain rules — in which case those specific slices, not the architecture, get simplified.
