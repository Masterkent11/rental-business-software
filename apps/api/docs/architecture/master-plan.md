# API Architecture Master Plan

This document serves as the **authoritative architectural blueprint** for `apps/api`.

---

## 1. Architectural Goals & Philosophy

`apps/api` is engineered using **Clean Architecture** combined with **Hexagonal Architecture (Ports and Adapters)**. The design is optimized for:

1. **Framework Independence**: The business core (Domain and Application layers) has zero knowledge of NestJS, Fastify, HTTP, PostgreSQL, Supabase, or AWS. The web framework and database drivers are peripheral plugins.
2. **High Cohesion & Low Coupling**: Each module, use case, port, and adapter has a single, well-defined architectural responsibility.
3. **Multi-Tenant Isolation**: Built-in multi-tenancy enforced at the database level (transaction-local PostgreSQL session configs for RLS) and validated at the application boundary.
4. **Testability**: Pure business logic can be unit-tested in milliseconds without booting a database or an HTTP server.
5. **Evolutionary Architecture**: The codebase is structured as a **Modular Monolith**, allowing individual capabilities (e.g. Payments, Tours, Bookings) to be extracted into independent microservices with minimal friction when scale demands it.

---

## 2. Canonical Layer Architecture

The backend consists of exactly four top-level architectural layers:

```
src/
├── domain/           # Pure business models, rules, value objects & invariants
├── application/      # Orchestration use cases & outbound port contracts
├── infrastructure/   # Concrete outbound adapters implementing application ports
└── modules/          # Inbound HTTP transport adapters & NestJS composition roots
```

### Architectural Dependency Flow

```mermaid
flowchart TD
    subgraph MODULES["MODULES LAYER (Inbound Adapters)"]
        HTTP[HTTP Request / Fastify] --> Controllers[Controllers]
        Controllers --> DTO[DTOs & Zod Validation]
        Controllers --> Mappers[HTTP Mappers]
        ModuleRoot[NestJS .module.ts Composition Root]
    end

    subgraph APPLICATION["APPLICATION LAYER (Use Cases & Ports)"]
        UseCases[Application Use Cases]
        Ports[Application Port Interfaces (*.port.ts)]
    end

    subgraph DOMAIN["DOMAIN LAYER (Pure Business Core)"]
        Entities[Domain Entities]
        Rules[Domain Rules & Calculations]
        VO[Value Objects]
        Errors[Domain Errors]
    end

    subgraph INFRASTRUCTURE["INFRASTRUCTURE LAYER (Outbound Adapters)"]
        PG[Postgres Repositories]
        Storage[Storage Adapters]
        Auth[Identity Providers]
        Pay[Payment Gateways]
    end

    Controllers -->|Invokes| UseCases
    UseCases -->|Orchestrates| Entities
    UseCases -->|Executes| Rules
    UseCases -->|Calls Port Contract| Ports
    PG -.->|Implements| Ports
    Storage -.->|Implements| Ports
    Auth -.->|Implements| Ports
    Pay -.->|Implements| Ports
    ModuleRoot -->|Wires Concrete Adapters to Ports & Use Cases| UseCases
```

---

## 3. Strict Layer Responsibilities

### A. Domain Layer (`src/domain/`)
The inner-most core. Represents enterprise business rules and invariants.
- **Allowed**: Pure TypeScript entities, value objects, business rule functions, domain events, domain error classes, pure calculations (e.g. centavos money calculations, occupancy validations).
- **Forbidden**: NestJS decorators, Fastify objects, HTTP concepts, Zod schemas, database clients (`postgres.js`, `sql`), ORM, Supabase SDKs, environment variables, or imports from `application/`, `infrastructure/`, or `modules/`.

### B. Application Layer (`src/application/`)
Orchestrates domain objects to execute business use cases and defines outbound port contracts.
- **Allowed**: Granular use cases (`*.use-case.ts`), application authorization rules (`application-authorization.rules.ts`), outbound port interfaces (`application/ports/*/*.port.ts`), transaction interfaces (`unit-of-work.port.ts`).
- **Forbidden**: NestJS decorators, HTTP controllers, HTTP DTOs, Zod schemas, HTTP exceptions (`BadRequestException`, etc.), direct database queries, concrete SDK implementations, imports from `infrastructure/` or `modules/`.

### C. Infrastructure Layer (`src/infrastructure/`)
Outbound adapter implementations of application port interfaces.
- **Allowed**: PostgreSQL repositories (`postgres-*.repository.ts`), storage adapters (`supabase-*.adapter.ts`), identity providers (`jwks-identity.provider.ts`), payment gateway adapters (`sandbox-payment-gateway.adapter.ts`), image processing adapters (`sharp-*.adapter.ts`), database connection (`db.ts`).
- **Forbidden**: Imports from `modules/`, redefining business interfaces outside `application/ports/`.

### D. Modules Layer (`src/modules/`)
Inbound HTTP transport adapters and NestJS dependency injection composition roots.
- **Controllers (`*.controller.ts`)**: Inbound adapters that translate HTTP requests to application commands and use-case calls. Controllers MUST NOT contain business logic, direct repository calls, database queries, or domain calculations.
- **DTOs (`*.dto.ts`)**: HTTP transport validation schemas using Zod and TypeScript infer types.
- **Mappers (`*.mapper.ts`)**: Pure presentation transformation from domain/application results to HTTP response payloads.
- **Composition Roots (`*.module.ts`)**: Pure DI wiring that instantiates infrastructure adapters, binds them to application port tokens, and injects them into use cases.

---

## 4. Multi-Tenancy & Data Isolation

Multi-tenancy is enforced through **Row-Level Security (RLS)** in PostgreSQL combined with transaction-local scope configuration in `src/infrastructure/postgres/db.ts`:

1. **Organization Scoping**:
   ```sql
   SELECT set_config('app.organization_id', '<org-id>', true);
   ```
   The `true` parameter makes the configuration **transaction-local**, preventing connection pool contamination under pooled database connections (PgBouncer).
2. **User Identity Scoping**:
   ```sql
   SELECT set_config('app.user_id', '<user-id>', true);
   ```
   Used for tenant/applicant personal records (e.g. applications, saved listings, stays) that are platform-scoped rather than organization-scoped.

---

## 5. Architectural Anti-Patterns (Strictly Prohibited)

| Anti-Pattern | Description | Correct Approach |
| :--- | :--- | :--- |
| **God Controllers** | Controllers containing 10+ endpoints spanning unrelated business capabilities. | Split controllers by HTTP resource / cohesive capability (e.g. `GetMeController`, `GetMyStaysController`, `SavedListingsController`). |
| **Leaky Controllers** | Controllers directly importing repositories, storage, or DB connections. | Controllers must inject and invoke **application use cases only**. |
| **Domain Calculations in Transport** | Clamping coordinates, calculating fees, or parsing monetary values in controllers. | Domain rules and pure calculations belong strictly in `src/domain/`. |
| **DTO Escape** | Importing Zod DTOs into use cases, domain entities, or repositories. | DTOs are HTTP transport contracts; use cases accept typed input interfaces. |
| **Infrastructure Inversion Leak** | Application code importing concrete adapters directly. | Application code depends strictly on abstract `*.port.ts` interfaces. |
| **Re-export Shims** | Creating alias files that merely re-export another file. | Maintain exactly ONE canonical implementation for every architectural component. |
| **Fragile Relative Traversal** | Using `../../../../domain/...` across layers. | Use canonical `@/*` path aliases (`@/domain/...`, `@/application/...`, etc.). |

---

## 6. Microservices Scalability Strategy

Because every business capability (Applications, Bookings, Collection, Listings, Me, Payments, Tours) is cleanly isolated:
1. All inter-layer dependencies cross strictly through Application Use Cases and Ports.
2. In-memory method calls to use cases can be converted to gRPC or message queues with zero modification to the Domain or Application layers.
3. Outbound ports (e.g. `PaymentGateway`, `EventPublisher`) can be swapped between in-process adapters and remote service adapters via DI in `*.module.ts`.
