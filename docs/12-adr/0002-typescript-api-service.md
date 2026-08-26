# ADR-0002 — A standalone TypeScript API service, not Edge Functions

**Status:** Superseded by [ADR-0012](0012-nestjs-decorator-free-application.md) · **Date:** 2026-08-20 · **Deciders:** Step 3

> Superseded on 2026-08-22. The transport conclusions still hold — one deployable, Fastify, no microservices. What changed is the framework: NestJS is now required, and [ADR-0012](0012-nestjs-decorator-free-application.md) records how the coupling this ADR feared is avoided rather than accepted.

## Context

[ADR-0001](0001-supabase-api-mediated.md) requires an API layer between clients and the database. Supabase offers Edge Functions (Deno, per-function deployment) as the native option.

The API has to hold a layered domain core, run transactions at `SERIALIZABLE` with advisory locks ([ADR-0005](0005-occupancy-write-serialization.md)), run background jobs, and stay portable off Supabase.

## Decision

**One standalone TypeScript service** — Fastify for transport — containing the hexagonal core, the HTTP routes, and the background workers. Deployed as a single process.

TypeScript because the web surfaces are TypeScript ([ADR-0010](0010-web-stack.md)), so domain vocabulary, money handling, and generated API types are shared rather than re-implemented. Only the Flutter customer app is a second language, and it is a client.

## Consequences

**Good**

- One deployable, one transaction story, one place invariants live.
- Long-lived connections suit `SERIALIZABLE` transactions and advisory locks; serverless connection churn does not.
- Background jobs share the domain layer, so an invoice raised by a job follows the same rules as one raised by a human.
- Portable: it is a container that speaks to Postgres.

**Bad, accepted**

- Something to deploy and monitor, versus functions that deploy themselves.
- No automatic scale-to-zero. Irrelevant at pilot size, real later.

## Alternatives

| Rejected | Why |
|---|---|
| **Supabase Edge Functions** | Deno per-function deployment fights a layered codebase; cold starts and short-lived connections fight serializable transactions; and it is the deepest possible coupling to the platform ADR-0001 wants to keep shallow |
| **NestJS** | Capable, and brings decorators and DI conventions that pull framework types into the application layer — the exact coupling [P-01](../02-architecture/architecture-principles.md#p-01--the-domain-does-not-know-what-a-database-is) prohibits |
| **Go or .NET** | Better raw throughput, at the cost of a second language, a second toolchain, and no shared types with the web surfaces. Throughput is not the pilot's problem |
| **Microservices** | V1's hardest problem is one serialized write to one table. Splitting it distributes the transaction that must not be distributed |

## Revisit when

- One deployable becomes a deployment bottleneck for more than one team.
- Background job volume needs independent scaling from request traffic.
