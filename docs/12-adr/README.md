# 12 — Architecture Decision Records

> **Status:** Written
> **Owner step:** Step 3 onward
> **Last updated:** 2026-08-20

One decision per file. An ADR records **what was decided, why, and what it costs** — including the options that were rejected and what would make us revisit.

[02-architecture](../02-architecture/) explains how the system works. These files decide.

## Format

```
Status:       Proposed | Accepted | Superseded by ADR-nnnn
Date:         ISO
Deciders:     Step that owned it
Context       the forces, honestly stated
Decision      what we are doing
Consequences  good and bad, both named
Alternatives  what was rejected, and why
Revisit when  the evidence that would reopen this
```

**Superseding, not editing.** An accepted ADR is not rewritten when we change our minds — a new one supersedes it, and the old one stays readable. The reasoning that was wrong is as useful as the reasoning that was right.

## The register

| # | Decision | Status |
|---|---|---|
| [0001](0001-supabase-api-mediated.md) | Supabase as the platform, API-mediated | Accepted |
| [0002](0002-typescript-api-service.md) | A standalone TypeScript API service, not Edge Functions | Superseded by 0012 |
| [0003](0003-hexagonal-vertical-slice.md) | Hexagonal core with vertical feature slices | Accepted |
| [0004](0004-availability-projection.md) | Availability projections as materialized tables | Accepted |
| [0005](0005-occupancy-write-serialization.md) | Occupancy writes serialize on the resource root | Accepted |
| [0006](0006-multi-tenancy-enforcement.md) | RLS enforced under a non-bypassing role | Accepted |
| [0007](0007-identity-and-sessions.md) | Supabase Auth for identity; capabilities resolved server-side | Accepted |
| [0008](0008-payment-provider-port.md) | Payments behind a port; provider choice deferred | Accepted |
| [0009](0009-media-pipeline.md) | Panoramas pre-processed into tiles at upload | Accepted |
| [0010](0010-web-stack.md) | Next.js App Router + TypeScript for every web surface | Accepted |
| [0011](0011-transactional-outbox.md) | Domain events via a transactional outbox | Accepted |
| [0012](0012-nestjs-decorator-free-application.md) | NestJS, with a decorator-free application layer | Accepted |

ADR-0004 and ADR-0005 were **named by Step 2 before Step 3 existed** ([occupancy-model.md](../03-domain/occupancy-model.md#what-this-costs)). The domain model identified them as decisions it must not make for itself, and reserved the numbers. Their content is Step 3's answer to questions Step 2 asked deliberately.
