# ADR-0001 — Supabase as the platform, API-mediated

**Status:** Accepted · **Date:** 2026-08-20 · **Deciders:** Step 3

## Context

V1 needs Postgres, authentication, file storage, and a local development story, for a pilot of three to five Organizations and roughly fifty rentable resources. Building each of those in-house delays the pilot by weeks that the product does not have.

Supabase supplies all four. Its fastest workflow — clients talking to Postgres directly through the SDK, with RLS as the authorization model — is also the workflow that makes the Step 2 invariants unenforceable:

- [I-01](../03-domain/invariants.md#i-01--no-overlapping-committed-occupancy) needs a serialized write path.
- [I-06](../03-domain/invariants.md#i-06--deposit-arithmetic-always-balances) needs arithmetic no policy can express.
- [I-10](../03-domain/invariants.md#i-10--the-ledger-and-audit-log-are-append-only) needs append-only enforcement.
- [I-08](../03-domain/invariants.md#i-08--payment-origin-is-immutable) needs evidence written by a trusted party.

There is also a stated intent to keep the platform replaceable rather than build on it permanently.

## Decision

**Use Supabase for Postgres, Auth, and Storage. Clients never touch it directly.** Every read and write of domain state goes through the API service, which is the only database writer.

Supabase is reached through four narrow adapters ([hexagonal-architecture.md](../02-architecture/hexagonal-architecture.md)): a Postgres connection, an `IdentityProvider`, a `FileStore`, and the local dev stack.

## Consequences

**Good**

- Postgres, auth, storage, and a Docker local stack on day one.
- Invariants stay enforceable, because there is exactly one writer.
- The migration path is four adapters, not a rebuild — Postgres is standard, RLS is a Postgres feature, Storage is S3-shaped, and the API already resolves capabilities itself.

**Bad, accepted**

- The fastest Supabase workflow is off the table. Client SDK writes are prohibited outright.
- PostgREST, Realtime for domain state, and Edge-Functions-as-backend go unused. Some of what is being paid for is not used.
- Two auth-adjacent systems to reason about: Supabase Auth holds sessions, the API holds capabilities ([authentication.md](../02-architecture/authentication.md)).

## Alternatives

| Rejected | Why |
|---|---|
| **Supabase with direct client access** | RLS cannot express serializable occupancy writes, deposit arithmetic, or append-only ledgers. The client would end up holding rules the domain model says belong to the server |
| **Plain managed Postgres, everything in-house** | Auth and storage are weeks of work that buy nothing the pilot needs to prove |
| **Firebase or another document platform** | The domain is relational and leans on constraints — exclusion constraints, composite foreign keys, RLS. A document store would move all of it into application code |

## Revisit when

- Supabase pricing or limits become material at real volume.
- RLS under connection pooling causes correctness incidents rather than inconveniences.
- The pilot succeeds and the platform bill exceeds the cost of running Postgres directly — at which point the adapters are already the migration plan.
