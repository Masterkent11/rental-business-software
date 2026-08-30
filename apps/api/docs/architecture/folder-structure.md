# API Folder Structure & Directory Governance

This document describes the **complete canonical folder structure** for `apps/api/src/`.

---

## 1. Top-Level Overview

```
apps/api/
├── AGENTS.md                         # Agent operational contract
├── docs/                             # Engineering documentation
│   └── architecture/                 # Architectural specifications & patterns
├── src/
│   ├── domain/                       # Pure business models, rules & invariants
│   ├── application/                  # Use cases & port contracts
│   ├── infrastructure/               # Outbound adapters (Postgres, Storage, etc.)
│   ├── modules/                      # Inbound HTTP adapters & Composition roots
│   ├── __tests__/                    # Root architecture test suite
│   ├── tests/                        # Modular architecture test suites
│   ├── app.module.ts                 # Main NestJS root module
│   └── main.ts                       # Application entry point
├── tsconfig.json                     # TypeScript compiler & path alias configuration
├── vitest.config.ts                  # Test runner configuration
└── package.json                      # Scripts & dependencies
```

---

## 2. Layer Breakdown & File Placement Rules

### A. Domain Layer (`src/domain/`)
```
src/domain/
├── <feature>/                        # Bounded domain feature (e.g. listings, bookings, collection)
│   ├── <entity>.ts                   # Core domain entity (e.g. listing.ts, booking.ts)
│   ├── <feature>-rules.ts            # Pure domain calculation & validation functions
│   ├── <feature>-state.ts            # State machines, status enums & transitions
│   ├── <feature>-errors.ts           # Domain error classes extending DomainError
│   ├── <feature>-events.ts           # Domain event type definitions
│   └── __tests__/                    # Domain unit tests (*.test.ts)
└── shared/                           # Reusable domain primitives
    ├── aggregate-root.ts
    ├── domain-error.ts
    ├── domain-event.ts
    ├── entity.ts
    ├── money.ts                      # Centavos value object
    └── organization-scope.ts         # OrganizationId branded type
```

### B. Application Layer (`src/application/`)
```
src/application/
├── ports/                            # Outbound port boundary contracts
│   ├── repositories/
│   │   └── *.port.ts                 # Persistence contracts (e.g. listing-repository.port.ts)
│   ├── providers/
│   │   └── *.port.ts                 # External service contracts (e.g. identity-provider.port.ts)
│   ├── storage/
│   │   └── *.port.ts                 # File/media storage contracts (e.g. media-storage.port.ts)
│   ├── transactions/
│   │   └── *.port.ts                 # Unit of work contracts (e.g. unit-of-work.port.ts)
│   ├── messaging/
│   │   └── *.port.ts                 # Messaging contracts (e.g. event-publisher.port.ts)
│   └── index.ts                      # Port re-exports
│
├── <feature>/                        # Bounded application feature (e.g. listings, me, tours)
│   ├── <use-case-name>/              # Dedicated folder per use case
│   │   ├── <use-case-name>.use-case.ts # Inbound application use case
│   │   ├── <use-case-name>.types.ts    # Input/Output interface contracts (optional if simple)
│   │   └── __tests__/                # Use case unit tests (*.test.ts)
│   └── ...
├── identity/
│   ├── resolve-principal/
│   └── application-authorization.rules.ts # Application capability & role assertion rules
└── index.ts                          # Public application API exports
```

### C. Infrastructure Layer (`src/infrastructure/`)
```
src/infrastructure/
├── postgres/
│   ├── repositories/
│   │   └── postgres-*.repository.ts  # Concrete Postgres repository adapters
│   ├── transactions/
│   │   └── postgres-unit-of-work.adapter.ts # Postgres transaction manager
│   ├── db.ts                         # Connection pool & RLS transaction scoping utilities
│   └── __tests__/                    # Integration tests (*.integration.test.ts)
├── storage/
│   ├── supabase-document-storage.adapter.ts
│   └── supabase-media-storage.adapter.ts
├── supabase/
│   ├── jwks-identity.provider.ts     # Supabase JWT identity provider
│   └── __tests__/
├── media/
│   ├── sharp-panorama-processor.adapter.ts # Sharp image processing adapter
│   └── __tests__/
├── payments/
│   ├── sandbox-payment-gateway.adapter.ts
│   └── payment-mappers.ts
├── messaging/
│   └── event-publisher.adapter.ts
├── system/
│   ├── system-clock.provider.ts
│   └── uuid-generator.provider.ts
└── config/
    └── environment-config.ts
```

### D. Modules Layer (`src/modules/`)
```
src/modules/
├── <feature>/                        # Bounded HTTP feature module
│   ├── controllers/
│   │   └── *.controller.ts           # Resource/capability HTTP controller adapters
│   ├── dto/
│   │   └── *.dto.ts                  # Zod request validation schemas & DTO types
│   ├── mappers/
│   │   └── *.mapper.ts               # HTTP response formatting mappers
│   ├── <feature>.tokens.ts           # DI injection tokens (Symbol / string constants)
│   ├── <feature>.module.ts           # NestJS module composition root
│   └── __tests__/                    # Contract / HTTP controller tests (*.contract.test.ts)
└── shared/
    └── http-exception.filter.ts      # Global domain/application error translation filter
```
