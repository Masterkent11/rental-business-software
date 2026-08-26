# ADR-0012 — NestJS, with a decorator-free application layer

**Status:** Accepted · **Date:** 2026-08-22 · **Deciders:** Step 6 — Implementation
**Supersedes:** [ADR-0002](0002-typescript-api-service.md)

## Context

[ADR-0002](0002-typescript-api-service.md) chose a standalone TypeScript service on Fastify and **rejected NestJS by name**, for one reason:

> NestJS brings decorators and DI conventions that pull framework types into the application layer — the exact coupling [P-01](../02-architecture/architecture-principles.md#p-01--the-domain-does-not-know-what-a-database-is) prohibits.

That reasoning was sound and is not withdrawn. What has changed is a requirement: the backend is to be NestJS, as a modular monolith, with the layering in [architecture-principles.md](../02-architecture/architecture-principles.md) preserved.

So the question is not "Nest or not" but **whether Nest can be adopted without the coupling ADR-0002 feared.** It can, and the mechanism is specific enough to be worth writing down, because the default way to use Nest does not achieve it.

## Decision

**NestJS for the API, with decorators confined to Presentation and Infrastructure.**

| Layer | May use Nest | How |
|---|---|---|
| Presentation | Yes | `@Controller`, `@Get`, `@Module` |
| Infrastructure | Yes | Adapter classes registered as providers |
| **Application** | **No** | Plain functions and classes. Wired with `useFactory` |
| **Domain** | **No** | Plain TypeScript. Imports nothing |

Three rules make that real rather than aspirational:

1. **No `@Injectable()` in `application/` or `domain/`.** Nest never constructs those classes by reflection; a module builds them with `useFactory` and hands them their ports.
2. **Injection is by explicit token**, never by inferred parameter type — `@Inject(LISTING_REPOSITORY)`. Type-based injection would require Nest to read the constructor's types, which is the reflection that drags framework metadata inward.
3. **A lint boundary enforces it.** `no-restricted-imports` forbids `@nestjs/*` inside `src/domain` and `src/application`. A rule enforced only by review is a rule that has already been broken somewhere.

Transport stays Fastify via `@nestjs/platform-fastify`, so ADR-0002's reasoning about long-lived connections suiting `SERIALIZABLE` transactions and advisory locks still holds.

## Consequences

**Good**

- Modular monolith with module boundaries the framework understands, and no microservices.
- The domain and application layers remain liftable: they import nothing from Nest, Supabase, or Postgres.
- Explicit tokens mean **no `emitDecoratorMetadata`**, so the code runs under esbuild-based tooling that does not implement it.
- ADR-0002's other conclusions survive intact — one deployable, Fastify transport, background jobs sharing the domain.

**Bad, accepted**

- More wiring code than idiomatic Nest. A `useFactory` per use case rather than a decorator.
- It is a non-standard way to use the framework, so a Nest developer joining will reach for `@Injectable()` in the wrong layer by habit. The lint rule catches it; the surprise is real.
- Two conventions in one codebase — decorated at the edges, plain in the middle.

## Alternatives

| Rejected | Why |
|---|---|
| **Idiomatic NestJS** (`@Injectable()` throughout) | Less wiring, and it puts framework decorators on use cases and domain services — exactly what ADR-0002 rejected and what [P-12](../02-architecture/architecture-principles.md#p-12--platform-features-are-used-through-ports-not-embraced) warns against. It would weaken the "replace Supabase without a rewrite" promise that ADR-0001 was accepted on |
| **Keep Fastify alone** | Does not meet the requirement |
| **Nest with type-based injection** | Requires `emitDecoratorMetadata`, which esbuild-based runners do not emit, and reintroduces reflection over application constructors |

## Revisit when

- Nest's wiring overhead measurably slows delivery, or
- the team decides the decorator-free application layer costs more in confusion than it buys in portability. That is a legitimate trade to reopen — with a new ADR, not by drifting.
