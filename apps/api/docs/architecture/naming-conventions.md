# API Naming Conventions & Import Standard

This document is the **definitive reference for file naming, identifier casing, and import conventions** in `apps/api`.

---

## 1. Architectural Suffix Rules

Suffixes in `apps/api` serve as **architectural role identifiers**, making boundaries immediately visible.

| Suffix | Architectural Role | Layer | Location | Examples |
| :--- | :--- | :--- | :--- | :--- |
| `*.port.ts` | Outbound contract interface | Application | `src/application/ports/*/` | `listing-repository.port.ts`<br>`payment-gateway.port.ts`<br>`document-storage.port.ts` |
| `*.use-case.ts` | Application use case | Application | `src/application/<feature>/<use-case>/` | `create-listing.use-case.ts`<br>`submit-application.use-case.ts`<br>`get-owner-collection.use-case.ts` |
| `*.dto.ts` | Inbound HTTP transport schema | Modules | `src/modules/<feature>/dto/` | `owner-listing.dto.ts`<br>`save-listing.dto.ts`<br>`issue-invoice.dto.ts` |
| `*.mapper.ts` | HTTP response presentation mapper | Modules | `src/modules/<feature>/mappers/` | `listing-http.mapper.ts`<br>`stay-http.mapper.ts`<br>`applications-http.mapper.ts` |
| `*.controller.ts`| Inbound HTTP adapter | Modules | `src/modules/<feature>/controllers/` | `owner-listings.controller.ts`<br>`saved-listings.controller.ts`<br>`get-me.controller.ts` |
| `*.module.ts` | Composition root / DI module | Modules | `src/modules/<feature>/` | `listings.module.ts`<br>`payments.module.ts`<br>`app.module.ts` |
| `*.tokens.ts` | DI injection tokens | Modules | `src/modules/<feature>/` | `listing.tokens.ts`<br>`payment.tokens.ts`<br>`me.tokens.ts` |
| `*.repository.ts`| Database repository adapter | Infrastructure | `src/infrastructure/postgres/repositories/` | `postgres-listing.repository.ts`<br>`postgres-invoice.repository.ts` |
| `*.adapter.ts` | External tool/service adapter | Infrastructure | `src/infrastructure/<tech>/` | `supabase-media-storage.adapter.ts`<br>`sharp-panorama-processor.adapter.ts`<br>`event-publisher.adapter.ts` |
| `*.provider.ts`| Utility / Identity provider | Infrastructure | `src/infrastructure/<tech>/` | `jwks-identity.provider.ts`<br>`system-clock.provider.ts`<br>`uuid-generator.provider.ts` |

---

## 2. Domain Naming Policy: Natural Naming

In `src/domain/`, domain concepts are already explicit and self-explanatory. **Do NOT force artificial suffixes on domain files.**

```
GOOD:
src/domain/
  listings/
    listing.ts                # Core entity
    listing-state.ts          # State definitions
    listing-rules.ts          # Pure business calculation rules
    listing-errors.ts         # Domain errors
  shared/
    money.ts                  # Centavos value object
    entity.ts                 # Base Entity
    domain-error.ts           # Base DomainError

AVOID (Suffix Inflation):
  listing.entity.ts
  listing.state.ts
  listing.rules.ts
  listing.errors.ts
```

---

## 3. File & Identifier Casing Conventions

1. **File Names**: Always `kebab-case` with their corresponding architectural suffix.
   - `postgres-listing.repository.ts`
   - `search-listings.use-case.ts`
   - `listing-http.mapper.ts`
2. **Classes & Interfaces**: Always `PascalCase`.
   - `export interface ListingRepository`
   - `export class OwnerListingsController`
   - `export class PostgresUnitOfWork`
3. **Functions & Factories**: Always `camelCase`.
   - `export const searchListings = (listings: ListingRepository) => ...`
   - `export const postgresListingRepository = (): ListingRepository => ...`
4. **Constants & Injection Tokens**: Always `UPPER_SNAKE_CASE` or `Symbol`.
   - `export const LISTING_REPOSITORY = Symbol('LISTING_REPOSITORY');`
   - `export const SEARCH_LISTINGS = Symbol('SEARCH_LISTINGS');`
   - `export const CURRENCY = 'PHP' as const;`

---

## 4. Import Path Standard: Canonical `@/*` Aliases

Internal source imports MUST always use configured `@/*` path aliases mapping to `src/*`:

```typescript
// ✅ CORRECT: Canonical @/* aliases
import type { Listing } from '@/domain/listings/listing.ts';
import { createListing } from '@/application/listings/create-listing/create-listing.use-case.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import { postgresListingRepository } from '@/infrastructure/postgres/repositories/postgres-listing.repository.ts';

// ❌ INCORRECT: Fragile cross-layer relative traversals
import type { Listing } from '../../../../domain/listings/listing.ts';
import { createListing } from '../../../application/listings/create-listing/create-listing.use-case.ts';
```

> [!NOTE]
> Same-directory sibling imports (e.g. `./listing.dto.ts` within `src/modules/listings/dto/`) are permitted for co-located files, but cross-layer dependencies must always use `@/*`.
