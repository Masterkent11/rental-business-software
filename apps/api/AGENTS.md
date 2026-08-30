# AGENTS.md — API Architecture Operational Contract

This document is the **mandatory operational contract** for any AI agent or automated coding assistant working within `apps/api`.

Before reading or writing any code in `apps/api`, you MUST adhere strictly to the rules, layer boundaries, naming conventions, and quality gates documented below.

---

## 1. Core Architectural Laws

The backend strictly follows **Clean Architecture + Hexagonal (Ports & Adapters) Architecture**.

```
                 HTTP Request / Fastify
                          │
                          ▼
                 ┌──────────────────┐
                 │   src/modules/   │  ← Inbound HTTP Adapters & Composition Roots
                 │   controllers    │     (Controllers, DTOs, Mappers, .module.ts)
                 │   DTOs / Mappers │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ src/application/ │  ← Application Orchestration & Outbound Ports
                 │    use cases     │     (Use Cases, .port.ts contracts)
                 │     ports        │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │   src/domain/    │  ← Pure Business Domain Core
                 │ entities, rules  │     (Framework-independent TypeScript)
                 │ value objects    │
                 └──────────────────┘
                          ▲
                          │ implements ports
                 ┌────────┴─────────┐
                 │src/infrastructure│  ← Outbound Infrastructure Adapters
                 │ PostgreSQL, S3   │     (.repository.ts, .adapter.ts, .provider.ts)
                 │ Supabase, Sharp  │
                 └──────────────────┘
```

### Dependency Rules:
1. **`domain/`** depends on **NOTHING** outside `domain/`.
   - FORBIDDEN: NestJS, Fastify, HTTP, Zod, Supabase, PostgreSQL, ORM, SDKs, `@/application`, `@/infrastructure`, `@/modules`.
2. **`application/`** depends ONLY on **`domain/`** and **`application/ports/`**.
   - FORBIDDEN: NestJS, Fastify, HTTP exceptions, Zod, Supabase, PostgreSQL, `@/infrastructure`, `@/modules`.
3. **`infrastructure/`** implements contracts defined in **`application/ports/`**.
   - FORBIDDEN: `@/modules`.
4. **`modules/`** contains inbound HTTP transport adapters and composition roots.
   - Controllers invoke **`application/` use cases only**.
   - FORBIDDEN: Controllers calling repositories, storage ports, payment gateways, database clients (`sql`), or concrete adapters directly.

---

## 2. Strict Naming Conventions

Always use the explicit architectural role suffixes:

| Architectural Role | File Suffix | Directory Location | Example |
| :--- | :--- | :--- | :--- |
| **Application Port** | `*.port.ts` | `src/application/ports/*/` | `listing-repository.port.ts` |
| **Application Use Case** | `*.use-case.ts` | `src/application/<feature>/<use-case>/` | `create-listing.use-case.ts` |
| **HTTP DTO** | `*.dto.ts` | `src/modules/<feature>/dto/` | `owner-listing.dto.ts` |
| **HTTP Mapper** | `*.mapper.ts` | `src/modules/<feature>/mappers/` | `listing-http.mapper.ts` |
| **HTTP Controller** | `*.controller.ts` | `src/modules/<feature>/controllers/` | `owner-listings.controller.ts` |
| **Composition Root** | `*.module.ts` | `src/modules/<feature>/` | `listings.module.ts` |
| **DI Tokens** | `*.tokens.ts` | `src/modules/<feature>/` | `listing.tokens.ts` |
| **Infrastructure Repository** | `*.repository.ts` | `src/infrastructure/postgres/repositories/` | `postgres-listing.repository.ts` |
| **Infrastructure Adapter** | `*.adapter.ts` | `src/infrastructure/<tech>/` | `supabase-media-storage.adapter.ts` |
| **Infrastructure Provider** | `*.provider.ts` | `src/infrastructure/<tech>/` | `system-clock.provider.ts` |
| **Domain Artifacts** | `*.ts` (natural) | `src/domain/<feature>/` | `application.ts`, `listing-rules.ts` |

---

## 3. Path Alias Standards

Always use canonical `@/*` path aliases for internal source imports:
- `@/domain/...`
- `@/application/...`
- `@/infrastructure/...`
- `@/modules/...`

**Never** use fragile cross-layer relative traversals (e.g. `../../../../domain/...`).

---

## 4. Operational Checklist Before Declaring Completion

When adding or modifying code in `apps/api`:
1. [ ] **Domain Purity**: Ensure business rules and calculations live in `src/domain/`, not in controllers or use cases.
2. [ ] **Granular Use Cases**: Create a dedicated directory and `*.use-case.ts` file per capability. Do not create monolithic use case files.
3. [ ] **Thin Controllers**: Ensure controllers validate DTOs with Zod, extract the authenticated principal, invoke the use case, map the response with `*.mapper.ts`, and return. Zero domain calculations or database calls in controllers.
4. [ ] **Port Contracts**: Ensure outbound adapters implement `*.port.ts` contracts defined in `src/application/ports/`.
5. [ ] **Composition Roots**: Ensure concrete adapters are only wired inside `*.module.ts` files.
6. [ ] **No Re-export Shims**: Maintain exactly one canonical implementation of every concept. Do not create compatibility aliases.
7. [ ] **Quality Gates**: Run and verify all three gates pass with zero errors:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```

---

## 5. Architectural Reference Documents

For detailed guides and reference implementations, consult:
- [Master Plan](docs/architecture/master-plan.md) — High-level architecture, layer responsibilities, multi-tenancy.
- [Patterns Catalog](docs/architecture/patterns.md) — Deep dive into all 15 architectural patterns.
- [Folder Structure](docs/architecture/folder-structure.md) — Directory layout and organization rules.
- [Naming Conventions](docs/architecture/naming-conventions.md) — Detailed naming standard.
- [Development Workflow](docs/architecture/development-workflow.md) — Step-by-step 14-stage development process.
- [Testing Governance](docs/architecture/testing-governance.md) — Automated ARCH rules & testing gates.
