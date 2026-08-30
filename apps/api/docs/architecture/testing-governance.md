# API Testing Governance & Architectural Rules

This document details the **automated architectural governance system** enforcing Clean Architecture + Hexagonal Architecture boundaries in `apps/api`.

---

## 1. Automated Architecture Test Suite (`src/__tests__/architecture.test.ts`)

The architecture test suite executes as a standard Vitest test suite (`npm test`) on every run. It parses the entire TypeScript abstract syntax and import graph to enforce **28 inviolable architectural rules**.

---

## 2. Catalog of Architectural Rules (ARCH-001 through ARCH-028)

### Domain Layer Isolation
- **ARCH-001: Domain has NO Supabase dependency**
  - *Rule*: Files under `src/domain/` must never import Supabase client libraries or types.
- **ARCH-002: Domain has NO PostgreSQL dependency**
  - *Rule*: Files under `src/domain/` must never import Postgres drivers or query builders.
- **ARCH-003: Domain has NO NestJS or Fastify dependency**
  - *Rule*: Files under `src/domain/` must remain pure TypeScript; zero framework decorators or HTTP types.
- **ARCH-004: Domain has NO Application or Ports dependency**
  - *Rule*: Domain entities and value objects must never import application use cases or port contracts.
- **ARCH-005: Domain has NO Modules dependency**
  - *Rule*: Domain files must never import controllers, DTOs, mappers, or modules.

### Application Layer Isolation
- **ARCH-006: Application use cases have NO dependency on Infrastructure**
  - *Rule*: Use cases depend solely on abstract `*.port.ts` contracts; zero concrete infrastructure imports.
- **ARCH-007: Application use cases have NO dependency on Supabase SDK**
  - *Rule*: Third-party authentication and storage SDKs remain behind outbound application ports.
- **ARCH-008: Application use cases have NO dependency on PostgreSQL SDK**
  - *Rule*: Direct database connections and query building are forbidden inside use cases.
- **ARCH-009: Application must never import Modules**
  - *Rule*: Application files must never import HTTP transport controllers, DTOs, or mappers.

### Infrastructure Layer Governance
- **ARCH-010: Infrastructure must never import Modules**
  - *Rule*: Database repositories and service adapters must not import HTTP controllers or transport schemas.
- **ARCH-011: Infrastructure implements Application ports**
  - *Rule*: All concrete adapters must implement an explicit `*.port.ts` contract defined in `src/application/ports/`.

### Modules & Controller Boundaries
- **ARCH-012: No Controller -> Concrete Infrastructure Adapter dependency**
  - *Rule*: Controllers must never import concrete repository or adapter implementations.
- **ARCH-013: Controllers must never depend directly on repositories, storage, or DB clients**
  - *Rule*: Controllers must invoke **application use cases only**; never repositories or storage ports directly.
- **ARCH-014: Controllers reside strictly under `modules/*/controllers/`**
  - *Rule*: All controller files must be co-located in their feature's controller directory.
- **ARCH-015: DTOs are strictly HTTP transport concerns**
  - *Rule*: DTOs and Zod validation schemas must never be imported by `domain/`, `application/`, or `infrastructure/`.
- **ARCH-016: HTTP exceptions remain strictly in modules**
  - *Rule*: NestJS HTTP exceptions (`BadRequestException`, `NotFoundException`, etc.) must never leak into `domain/` or `application/`.

### Naming & Structural Governance
- **ARCH-017: All application ports MUST use `*.port.ts` suffix**
  - *Rule*: Every contract under `src/application/ports/` must end in `.port.ts`.
- **ARCH-018: All application use cases MUST use `*.use-case.ts` suffix**
  - *Rule*: Every use case under `src/application/` must end in `.use-case.ts`.
- **ARCH-019: All HTTP DTOs MUST use `*.dto.ts` suffix**
  - *Rule*: Inbound transport schemas must end in `.dto.ts` and reside in `src/modules/*/dto/`.
- **ARCH-020: All HTTP Mappers MUST use `*.mapper.ts` suffix**
  - *Rule*: Presentation mappers must end in `.mapper.ts` and reside in `src/modules/*/mappers/`.
- **ARCH-021: All Controllers MUST use `*.controller.ts` suffix**
  - *Rule*: Inbound controllers must end in `.controller.ts` and reside in `src/modules/*/controllers/`.
- **ARCH-022: Infrastructure implementations MUST use explicit role suffixes**
  - *Rule*: Implementations must use `.repository.ts`, `.adapter.ts`, or `.provider.ts`.
- **ARCH-023: No legacy feature directories or duplicate canonical implementations**
  - *Rule*: Prohibits duplicate feature structures (`features/`, `domain/money/`, `application/collect-rent`, etc.).
- **ARCH-024: No duplicate re-export compatibility shims**
  - *Rule*: Eliminates empty re-export pass-through files across the codebase.
- **ARCH-025: All cross-layer imports use canonical `@/*` aliases**
  - *Rule*: Prohibits fragile cross-layer relative paths (`../../../../domain/...`).
- **ARCH-026: No circular dependencies cross architectural boundaries**
  - *Rule*: The static dependency graph across architectural layers must form a strict Directed Acyclic Graph (DAG).
- **ARCH-027: Composition root is the only layer wiring infrastructure to use cases**
  - *Rule*: Only `*.module.ts` files may instantiate concrete adapters and provide them to use cases.
- **ARCH-028: External authentication providers remain behind an application-defined identity port**
  - *Rule*: Supabase Auth and JWKS providers must implement `IdentityProvider` from `src/application/ports/providers/identity-provider.port.ts`.

---

## 3. Mandatory CI/CD Verification Gates

Every pull request and build must pass all quality gates:

| Quality Gate | Command | Scope | Target |
| :--- | :--- | :--- | :--- |
| **Typecheck** | `npm run typecheck` | Whole project TypeScript compiler | 0 errors |
| **Lint** | `npm run lint` | ESLint static analysis | 0 warnings, 0 errors |
| **Unit Tests** | `npm test` | Domain & Application unit tests | 100% pass |
| **Architecture Tests** | `npm test` | 28/28 ARCH rules in `architecture.test.ts` | 100% pass |
| **Contract Tests** | `npm test` | HTTP Controller & Mapper contract tests | 100% pass |
| **Integration Tests** | `npm test` (with `DATABASE_URL`) | PostgreSQL repository integration tests | 100% pass |
