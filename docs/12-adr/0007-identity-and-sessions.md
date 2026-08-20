# ADR-0007 — Supabase Auth for identity; capabilities resolved server-side

**Status:** Accepted · **Date:** 2026-08-20 · **Deciders:** Step 3

## Context

D-15 requires one account for life: a customer who signs a lease gains tenant capabilities on the same account, with no re-registration. D-16 keeps Owner and Tenant distinct actors.

Supabase Auth handles credentials, verification, and session refresh. The tempting shortcut is to put capabilities into the JWT and let the API trust it.

## Decision

**Supabase Auth for identity only.** The token answers *who*, and nothing else.

**Capabilities, Organization membership, and staff assignments are loaded from the database on every authenticated request** and never read from token claims.

Sign-in: email + password, and mobile + OTP — the latter because a phone number is the identifier most Philippine tenants actually have.

Organization context travels as a request header, verified against membership, never defaulted silently ([authentication.md](../02-architecture/authentication.md)).

## Consequences

**Good**

- Revocation works immediately. A dismissed staff member's next request fails, rather than their hour-old token continuing to authorize cash recordings.
- Capability changes — a lease activating, a guest checking out — take effect without forcing a re-login, which is what D-15 requires.
- The `IdentityProvider` port is one interface, so replacing Supabase Auth with any OIDC provider is a single adapter.

**Bad, accepted**

- One indexed capability lookup per authenticated request. Cached per request; not cached across them, deliberately.
- Two systems in the auth story: Supabase holds sessions, the platform holds authority.

## Alternatives

| Rejected | Why |
|---|---|
| **Capabilities in JWT claims** | A token is a snapshot of authority that changes constantly here. The failure case is a revoked staff member recording payments, on the product's most sensitive path |
| **Custom auth from scratch** | Weeks of credential handling and verification flows that buy the pilot nothing |
| **Session lookup on every request against Supabase** | A network hop per request to learn what a signature already proves |

## Revisit when

- The capability lookup shows up in latency profiles.
- Multi-factor authentication is required for privileged accounts before pilot exit.
