# API Architecture Patterns Catalog

This document defines the **15 canonical architectural patterns** used throughout `apps/api`, including code templates and explicit guidance on when to use and when NOT to use each pattern.

---

## 1. Domain Entity Pattern

### Purpose
Represents a domain concept with a unique identity that persists across state changes over time.

### Implementation
```typescript
// src/domain/listings/listing.ts
import type { Centavos } from '@/domain/shared/money.ts';
import type { OrganizationId } from '@/domain/shared/organization-scope.ts';

export type ListingKind = 'LONG_TERM' | 'SHORT_TERM';
export type ListingState = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';

export interface Listing {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly resourceId: string;
  readonly kind: ListingKind;
  readonly title: string;
  readonly description: string;
  readonly priceCentavos: Centavos;
  readonly state: ListingState;
  readonly photos: readonly string[];
}
```

- **When to Use**: For business objects with identity, lifecycle states, and domain invariants.
- **When NOT to Use**: For transient data transfer structures (use DTOs or View interfaces).

---

## 2. Value Object Pattern

### Purpose
Represents an immutable, conceptual whole defined solely by its values without a distinct identity.

### Implementation
```typescript
// src/domain/shared/money.ts
export type Centavos = number & { readonly __brand: 'Centavos' };

export const centavos = (value: number): Centavos => {
  if (!Number.isInteger(value)) {
    throw new RangeError(`Money must be whole centavos, received ${value}`);
  }
  if (value < 0) {
    throw new RangeError(`Money is never negative, received ${value}`);
  }
  return value as Centavos;
};
```

- **When to Use**: For domain primitives requiring strict validation (Money, Dates, Coordinate Angles, Email).
- **When NOT to Use**: For database row representations with independent IDs.

---

## 3. Domain Error Pattern

### Purpose
Represents business rule violations or domain invariant failures.

### Implementation
```typescript
// src/domain/shared/domain-error.ts
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// src/domain/collection/collection-errors.ts
export class InvoiceNotSettleableError extends DomainError {}
export class InvoiceOverpaidError extends DomainError {}
```

- **When to Use**: For invalid domain state transitions, constraint violations, and business logic rejections.
- **When NOT to Use**: For HTTP-specific transport errors (e.g. 404, 401); the HTTP layer maps domain errors into HTTP exceptions via `PresentationExceptionFilter`.

---

## 4. Domain Event Pattern

### Purpose
Captures an immutable record of something significant that happened in the business domain.

### Implementation
```typescript
// src/domain/shared/domain-event.ts
export interface DomainEvent<T = unknown> {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly payload: T;
}
```

- **When to Use**: When state changes trigger side-effects (notifications, audit logging, analytics).
- **When NOT to Use**: For internal function return values.

---

## 5. Application Use Case Pattern

### Purpose
Orchestrates domain entities, executes business rules, queries ports, and applies application authorizations.

### Implementation
```typescript
// src/application/listings/create-listing/create-listing.use-case.ts
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { Listing, ListingKind } from '@/domain/listings/listing.ts';
import type { Centavos } from '@/domain/shared/money.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface CreateOwnerListingInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly resourceId: string;
  readonly kind: ListingKind;
  readonly title: string;
  readonly description: string;
  readonly priceCentavos: Centavos;
  readonly amenities: readonly string[];
  readonly houseRules: readonly string[];
  readonly terms: readonly string[];
  readonly minStayNights: number | null;
  readonly advanceMonths: number;
  readonly depositMonths: number;
  readonly photos: readonly string[];
}

export const createListing =
  (listings: ListingRepository) =>
  async (input: CreateOwnerListingInput): Promise<Listing> => {
    assertMayManageOrganization(input.principal, input.organizationId);

    return listings.createListing({
      organizationId: input.organizationId,
      resourceId: input.resourceId,
      kind: input.kind,
      title: input.title,
      description: input.description,
      priceCentavos: input.priceCentavos,
      amenities: input.amenities,
      houseRules: input.houseRules,
      terms: input.terms,
      minStayNights: input.minStayNights,
      advanceMonths: input.advanceMonths,
      depositMonths: input.depositMonths,
      photos: input.photos,
    });
  };
```

- **When to Use**: For every application operation/business capability.
- **When NOT to Use**: Do not pack multiple unrelated capabilities into a single monolithic use-case file.

---

## 6. Repository Port Pattern

### Purpose
Defines an abstract outbound contract for entity persistence and retrieval without exposing SQL or ORM specifics.

### Implementation
```typescript
// src/application/ports/repositories/listing-repository.port.ts
import type { Listing } from '@/domain/listings/listing.ts';

export interface ListingRepository {
  findById(organizationId: string, listingId: string): Promise<Listing | null>;
  forOrganization(organizationId: string): Promise<readonly Listing[]>;
  createListing(input: CreateListingInput): Promise<Listing>;
  setListingState(organizationId: string, listingId: string, state: string): Promise<Listing | null>;
}
```

- **When to Use**: For database persistence boundaries.
- **When NOT to Use**: Do not place database-specific types (e.g. Postgres Row types) in repository port definitions.

---

## 7. Provider Port Pattern

### Purpose
Defines an abstract outbound interface for external services (identity, clock, ID generation, payment gateway).

### Implementation
```typescript
// src/application/ports/providers/clock.port.ts
export interface Clock {
  now(): Date;
}

// src/application/ports/providers/id-generator.port.ts
export interface IdGenerator {
  generate(): string;
}
```

- **When to Use**: When domain/application logic needs deterministic access to system clocks, UUIDs, or third-party APIs.
- **When NOT to Use**: For internal pure calculations that don't depend on system state.

---

## 8. Storage Port Pattern

### Purpose
Defines abstract file and media persistence operations.

### Implementation
```typescript
// src/application/ports/storage/media-storage.port.ts
export interface StoredObject {
  readonly path: string;
  readonly body: Buffer;
  readonly contentType: string;
}

export interface MediaStorage {
  put(objects: readonly StoredObject[]): Promise<void>;
  getPublicUrl(path: string): string;
}
```

- **When to Use**: For uploading/fetching binary assets (images, documents, 360-degree panoramas).
- **When NOT to Use**: For relational or metadata storage (use Repository ports).

---

## 9. Messaging Port Pattern

### Purpose
Defines asynchronous event publishing and message dispatching boundaries.

### Implementation
```typescript
// src/application/ports/messaging/event-publisher.port.ts
import type { DomainEvent } from '@/domain/shared/domain-event.ts';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: readonly DomainEvent[]): Promise<void>;
}
```

- **When to Use**: When broadcasting events across service boundaries or message queues.
- **When NOT to Use**: For synchronous in-process method invocation.

---

## 10. Unit of Work / Transaction Port Pattern

### Purpose
Ensures atomic execution across multiple repository write operations.

### Implementation
```typescript
// src/application/ports/transactions/unit-of-work.port.ts
export interface UnitOfWork {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}
```

- **When to Use**: When a single use case requires atomic changes across multiple database entities.
- **When NOT to Use**: For read-only queries or independent atomic operations.

---

## 11. Identity Provider Port Pattern

### Purpose
Abstracts external JWT verification and identity resolution.

### Implementation
```typescript
// src/application/ports/providers/identity-provider.port.ts
export interface VerifiedClaims {
  readonly sub: string;
  readonly email?: string;
}

export interface IdentityProvider {
  verifyToken(jwt: string): Promise<VerifiedClaims | null>;
}
```

- **When to Use**: For authentication boundaries (Supabase Auth, Auth0, Firebase, Keycloak).
- **When NOT to Use**: For business authorization rules (use application authorization rules).

---

## 12. Inbound HTTP DTO Pattern

### Purpose
Defines and validates incoming HTTP request payloads using Zod.

### Implementation
```typescript
// src/modules/listings/dto/owner-listing.dto.ts
import { z } from 'zod';

export const createListingSchema = z.object({
  resourceId: z.guid(),
  kind: z.enum(['LONG_TERM', 'SHORT_TERM']),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(4000).default(''),
  priceCentavos: z.number().int().nonnegative(),
  amenities: z.array(z.string().trim()).default([]),
  houseRules: z.array(z.string().trim()).default([]),
  terms: z.array(z.string().trim()).default([]),
  minStayNights: z.number().int().positive().nullable().optional(),
  advanceMonths: z.number().int().nonnegative().default(0),
  depositMonths: z.number().int().nonnegative().default(0),
  photos: z.array(z.string().trim()).default([]),
});

export type CreateListingDto = z.infer<typeof createListingSchema>;
```

- **When to Use**: In `src/modules/*/dto/` for HTTP body and query validation.
- **When NOT to Use**: Never import DTOs or Zod into `src/domain/` or `src/application/`.

---

## 13. HTTP Mapper Pattern

### Purpose
Transforms domain and application result objects into HTTP response representations.

### Implementation
```typescript
// src/modules/listings/mappers/listing-http.mapper.ts
import type { Listing } from '@/domain/listings/listing.ts';

export function toListingHttpResponse(listing: Listing) {
  return {
    id: listing.id,
    organizationId: listing.organizationId,
    resourceId: listing.resourceId,
    kind: listing.kind,
    title: listing.title,
    description: listing.description,
    priceCentavos: listing.priceCentavos,
    state: listing.state,
    photos: listing.photos,
  };
}
```

- **When to Use**: In `src/modules/*/mappers/` for presentation formatting.
- **When NOT to Use**: Do not put business calculations or database queries in mappers.

---

## 14. Resource HTTP Controller Pattern

### Purpose
Receives HTTP requests, validates DTOs, resolves authenticated principals, invokes application use cases, and maps responses.

### Implementation
```typescript
// src/modules/listings/controllers/owner-listings.controller.ts
@Controller('organizations/:organizationId')
export class OwnerListingsController {
  constructor(
    @Inject(CREATE_LISTING)
    private readonly createListingUseCase: ReturnType<typeof createListing>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post('listings')
  async createListing(
    @Param('organizationId') organizationId: string,
    @Body() rawBody: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const parsed = createListingSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid listing data');
    }

    const principal = await this.resolve({ authorization: auth, organizationId });
    const created = await this.createListingUseCase({
      principal,
      organizationId,
      ...parsed.data,
      priceCentavos: centavos(parsed.data.priceCentavos),
      minStayNights: parsed.data.minStayNights ?? null,
    });

    return toListingHttpResponse(created);
  }
}
```

- **When to Use**: For inbound REST endpoints grouped by resource/capability.
- **When NOT to Use**: Do not query repositories or perform domain calculations directly in controllers.

---

## 15. Composition Root Pattern

### Purpose
Wires infrastructure adapters to application port tokens and provides them to use cases.

### Implementation
```typescript
// src/modules/listings/listings.module.ts
@Module({
  controllers: [OwnerListingsController, SearchListingsController, ViewListingController],
  providers: [
    {
      provide: LISTING_REPOSITORY,
      useFactory: (): ListingRepository => postgresListingRepository(),
    },
    {
      provide: CREATE_LISTING,
      inject: [LISTING_REPOSITORY],
      useFactory: (repo: ListingRepository) => createListing(repo),
    },
    // ...
  ],
})
export class ListingsModule {}
```

- **When to Use**: In `src/modules/*/*.module.ts` and `src/app.module.ts`.
- **When NOT to Use**: No business logic or request orchestration belongs in module files.
