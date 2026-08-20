# Authorization

> **Status:** Written
> **Owner step:** Step 3 — Architecture
> **Last updated:** 2026-08-20
> **Depends on:** [roles-and-permissions.md](../01-product/roles-and-permissions.md), [authentication.md](authentication.md)
> **Informs:** [08-security](../08-security/), [04-api](../04-api/)

Enforcing the product-level capability matrix. Identity is [authentication.md](authentication.md); this is what that identity may do.

---

## Where the decision is made

**In the application layer, at the use case, before the domain is touched.**

```
   route ──▶ authorize(AuthContext, action, target) ──▶ use case ──▶ domain
                        │
                        └── deny ──▶ 403, audited
```

Not in the route (routes multiply; rules must not), not in the domain (the domain is about what is *valid*, not who may do it), and not in RLS (policies express isolation only — [multi-tenancy.md](multi-tenancy.md)).

**Deny by default.** A use case with no declared permission requirement fails to build. Forgetting to protect an endpoint should not be possible in silence.

---

## The model

Three inputs, in order of specificity:

| Input | Example |
|---|---|
| **Capability** | `STAFF` at Organization X |
| **Scope** | Assigned to Property P only |
| **Ownership** | This tenant's own invoice, this customer's own application |

All three must pass. A Property Manager with `PROPERTY_MANAGER` at the right Organization still cannot act on a property they are not assigned to; a tenant with `TENANT` still cannot read a co-tenant's personal details.

### Delegated authority

Two product decisions live here rather than in code comments:

- **Listing publication (U-03).** A Manager may always submit for approval and always unpublish. Publishing an approved listing requires the Organization's publish-delegation flag. Both actions record the acting user regardless.
- **Refunds.** Staff who may record cash may not return it ([payments-overview.md](../00-overview/payments-overview.md#who-may-do-what)). Recording and refunding are separate permissions on purpose, because they are the two halves of the same fraud.

---

## The rules that are structural, not configurable

Some prohibitions are too important to express as a permission someone could grant:

| Rule | Enforcement |
|---|---|
| A tenant cannot record their own payment | No use case exists that accepts a self-recorded payment. Not a denied permission — an absent capability in the API surface (D-09) |
| Nobody edits a ledger or audit entry | No update path exists, and the database role holds `INSERT` only ([I-10](../03-domain/invariants.md#i-10--the-ledger-and-audit-log-are-append-only)) |
| A customer cannot see unpublished listings | Query-level, not filter-level: unpublished listings are not in the public read path at all |
| A guest never becomes a tenant | No relationship exists to authorize ([I-12](../03-domain/invariants.md#i-12--a-short-term-stay-creates-no-tenancy)) |

**A permission that can be granted is a permission that will be granted.** These four cannot be.

---

## Privileged access

Platform Admin, Support, and Finance cross Organizations by design. Three constraints:

1. **Every cross-Organization access writes an audit entry first** — actor, Organization, record, time ([I-09](../03-domain/invariants.md#i-09--privileged-access-is-always-logged)). Logging is a precondition of the read, not a side effect of it.
2. **Support reads; it does not write domain state.** Support can look up a tenant's payment history and cannot alter it.
3. **Finance handles refunds and reconciliation** and cannot approve listings or verify Organizations. Separation of duties across the three privileged roles is deliberate.

---

## Testing obligation

[10-testing](../10-testing/) inherits one non-negotiable requirement: **every use case has a negative authorization test.** Not a sample — every one.

The matrix in [roles-and-permissions.md](../01-product/roles-and-permissions.md) is a product requirement, and a requirement with no failing test is a requirement nobody has checked. The cheapest place to discover that Staff can issue refunds is a test suite; the most expensive is a pilot.
