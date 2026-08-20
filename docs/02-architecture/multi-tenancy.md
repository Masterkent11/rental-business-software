# Multi-Tenancy

> **Status:** Written
> **Owner step:** Step 3 — Architecture
> **Last updated:** 2026-08-20
> **Depends on:** [relationships.md](../03-domain/relationships.md), [invariants.md](../03-domain/invariants.md)
> **Informs:** [05-database](../05-database/), [08-security](../08-security/)

How **Organization** isolation is enforced. The word *tenant* never appears here meaning platform tenancy (D-13).

---

## Two layers, independently sufficient

```
   Request
     │
     ▼
   ┌──────────────────────────────────────────────┐
   │  LAYER 1 — application scoping               │
   │  Every request resolves an OrganizationScope │
   │  Repositories refuse to run without one      │
   └────────────────────┬─────────────────────────┘
                        ▼
   ┌──────────────────────────────────────────────┐
   │  LAYER 2 — row-level security                │
   │  Postgres policies on organization_id        │
   │  Holds even if layer 1 is wrong              │
   └────────────────────┬─────────────────────────┘
                        ▼
                     Postgres
```

P-03. A single mechanism has a single failure mode, and the failure mode here is one Organization reading another's tenants, leases, and money.

---

## Layer 1 — application scoping

Every authenticated request carries an `AuthContext`:

| Field | From |
|---|---|
| `userId` | Verified token ([authentication.md](authentication.md)) |
| `capabilities` | Database, per request — never the token |
| `organizationId` | The Organization this request acts within |
| `assignedPropertyIds` | Staff assignments, for Managers and Staff |

From it the application derives an `OrganizationScope`, and **every repository method requires one as a parameter**. There is no method that queries an Organization-scoped table without it. The type system makes an unscoped query fail to compile, which is stronger than a code-review convention and cheaper than both.

Cross-Organization reads exist only for Platform Admin, Support, and Finance, through explicitly named repository methods (`findAcrossOrganizations`) that **write an audit entry before returning** ([I-09](../03-domain/invariants.md#i-09--privileged-access-is-always-logged)).

---

## Layer 2 — row-level security, actually enforced

This is the detail that decides whether the second layer exists at all:

> **The API does not connect as `service_role`.** Supabase's service key bypasses RLS entirely. An API using it has one isolation layer wearing a costume of two.

Instead the API connects as an application role that RLS applies to, and sets the scope per transaction:

```sql
-- at the start of every transaction, from the AuthContext
SELECT set_config('app.organization_id', $1, true);
SELECT set_config('app.user_id',         $2, true);

-- policy shape on every Organization-scoped table
CREATE POLICY org_isolation ON leases
  USING (organization_id = current_setting('app.organization_id')::uuid);
```

`true` makes the setting transaction-local, so a pooled connection cannot leak one request's scope into the next — the exact bug that makes connection pooling and RLS a dangerous combination when done casually.

**Policies contain no business rules.** They express one thing: this row belongs to this Organization. Authorization — who may do what — is the application's job ([authorization.md](authorization.md)), because a policy that encodes product rules is a rule the domain cannot test and a migration cannot review.

Details of the policies belong to [05-database](../05-database/) and [08-security](../08-security/). Fixed here: the mechanism, and the role.

---

## Where the boundary attaches

Every Organization-scoped table carries `organization_id` **directly**, never by joining up to its Property ([relationships.md](../03-domain/relationships.md#multi-tenancy-how-isolation-actually-attaches)).

Denormalized on purpose: isolation is enforced at the row, so it must be checkable at the row. A policy that walks four joins is a policy that will eventually be bypassed by a query written in a hurry. The redundancy costs an integrity constraint per table; the alternative costs a breach.

**Users are the exception.** A User is platform-scoped and carries no `organization_id`, because Ana is a tenant of one Organization while browsing another's listings (D-15). Access to Organization-scoped data flows through Capability, not through the account.

---

## Storage and files

Isolation does not stop at the database. Supabase Storage buckets are private, object paths are prefixed by `organization_id`, and **the API issues every signed URL** after checking scope. No client receives a bucket-wide token.

Application documents (government IDs, proof of income) and lease documents get short URL lifetimes and are never placed in a public bucket, ever.

---

## How this is tested

Isolation is not something to hope for. [10-testing](../10-testing/) inherits three requirements from this document:

1. **A cross-Organization test for every Organization-scoped read path.** Organization A's token must not see Organization B's row.
2. **An RLS-only test.** Layer 1 disabled, the query still returns nothing — proving layer 2 is real and not decorative.
3. **A pooled-connection test.** Two requests with different scopes on one connection, run in sequence, must not leak.

The third is the one that is usually skipped and is the one that fails in production.
