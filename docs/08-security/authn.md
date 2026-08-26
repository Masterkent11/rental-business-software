# Authentication — as built

> **Status:** Written (Sprint 2)
> **Owner step:** Step 8 — Security
> **Last updated:** 2026-08-22
> **Depends on:** [ADR-0007](../12-adr/0007-identity-and-sessions.md), [authentication.md](../02-architecture/authentication.md)
> **Informs:** [05-database](../05-database/README.md), [04-api](../04-api/README.md)

The architecture page states the intent. This one records what the code does.

## The shape of a request

```
Authorization: Bearer <supabase access token>   → who
X-Organization-Id: <uuid>                       → acting within (optional)
```

1. `jwksIdentityProvider` verifies the token against the project's **public**
   keys and returns `sub`, and nothing more.
2. `resolvePrincipal` loads capabilities **from the database**.
3. If `X-Organization-Id` is present it is checked against live membership.

## Verification uses public keys only

The project signs with **ES256** and publishes the public half at
`/auth/v1/.well-known/jwks.json`. The API holds no signing secret, so a leaked
read-only config cannot mint tokens — which is not true of the shared-secret
(HS256) alternative.

Four things are checked, and only four: **signature, expiry, issuer, audience.**

The audience check is not decoration. Supabase's publishable key yields a
well-formed token with `aud: "anon"` — a valid signature over *nobody*.
Accepting it would authenticate every anonymous visitor as a user. There is a
test for exactly that.

## Capabilities are loaded, never read from the token

```ts
// resolve-principal.ts — the important line is the one that is missing
const capabilities = await users.capabilitiesFor(verified.userId);
```

A token is a snapshot of authority that changes underneath it. The failure this
prevents is concrete: a dismissed staff member holding a valid hour-old token
continuing to record cash payments, on the trust surface D-09 exists to protect.

**Cost:** one indexed lookup per authenticated request, cached per request and
deliberately not across them.

## Capabilities are facts, not badges

`user_capabilities` records **what makes each one true** — `source_type` of
`REGISTRATION`, `MEMBERSHIP`, `LEASE`, `STAY`, or `PLATFORM`, with the id of the
thing itself.

Storing a bare list per user would mean two sources of truth that drift: the
lease ends and the badge stays. Revocation closes the row that carried the
reason, so the capability goes when its cause does.

Sprint 2 populates `CUSTOMER` (registration) and `OWNER`/`STAFF` (membership).
`TENANT` and `GUEST` arrive with leases and stays; the shape is already there so
they slot in without a migration under load.

## Organization context is verified, never defaulted

A user may be tenant of one organization and staff at another, so the
organization is part of the **request**, not the identity.

The header claims; membership decides. Nothing defaults silently — acting inside
the wrong organization without either side noticing is worse than being asked to
pick one.

| Situation | Response |
|---|---|
| No token | **401** |
| Bad signature, expired, wrong issuer, `aud: anon` | **401** |
| Malformed `X-Organization-Id` | **400** |
| Not a member of that organization | **403** |

401 and 403 are kept apart deliberately: "I do not know who you are" and "I know
who you are and you may not act there" are different problems, and a client that
cannot tell them apart retries the wrong one.

## Sessions on the device

`supabase_flutter` holds the refresh token in the **platform keychain/keystore**
and refreshes in the background — never shared preferences. The app reads the
access token per request through a closure rather than capturing it, so a
background refresh is picked up without rebuilding the client.

The client never sees a password reach the API: it authenticates with Supabase
and sends the resulting token onward.

### The app depends on an interface, not on Supabase

`AuthGateway` is the app's own interface; `SupabaseAuthGateway` implements it.
No Supabase type appears above the data layer, so replacing the provider is one
new class — the same replaceability [ADR-0001](../12-adr/0001-supabase-api-mediated.md)
claims on the server, honoured on the client.

## Keys

| Key | Where it may appear |
|---|---|
| `sb_publishable_*` | The shipped app. Grants nothing on its own — every table has RLS |
| `sb_secret_*` | **Nowhere in this repository.** It bypasses RLS entirely |

The API connects to PostgreSQL as `rental_app` — `NOSUPERUSER`, `NOBYPASSRLS` —
so the database half of [ADR-0006](../12-adr/0006-multi-tenancy-enforcement.md)
is real rather than nominal. An integration test asserts the role cannot bypass,
because if it could, every isolation test would pass and prove nothing.

## Identity isolation at the database

Identity is platform-scoped: a user belongs to no organization. So the identity
tables are isolated by **user**, not by tenant:

```sql
create policy own_saved on saved_listings using (
  user_id = nullif(current_setting('app.user_id', true), '')::uuid
);
```

`app.user_id` is set transaction-locally alongside `app.organization_id`, for
the same reason: a pooled connection must not carry one request's identity into
the next. Tests assert that one user's saved listings and profile are invisible
to another — through RLS, not through a `WHERE` clause the application could
forget.

## Not built yet

- **Multi-factor authentication.** ADR-0007 lists it as a revisit point before
  pilot exit, not V1.
- **Account deactivation.** The column exists (`deactivated_at`) because
  deletion is wrong — a former tenant's payment history has to survive them
  leaving — but nothing writes it yet.
- **Staff invitation flows.** `organization_members` is populated directly for
  now; the owner-facing flow is Step 7's.
