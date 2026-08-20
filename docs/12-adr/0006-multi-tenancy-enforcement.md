# ADR-0006 — RLS enforced under a non-bypassing role

**Status:** Accepted · **Date:** 2026-08-20 · **Deciders:** Step 3

## Context

Organization is the isolation boundary (D-13), and [I-02](../03-domain/invariants.md#i-02--no-cross-organization-references) forbids any cross-Organization reference. The failure mode is one Organization reading another's tenants, leases, and money.

Supabase supplies RLS. It also supplies a `service_role` key that **bypasses RLS entirely** — and a backend using it has one isolation layer while appearing to have two.

## Decision

**Two layers, both real.**

1. **Application scoping.** Every repository method requires an `OrganizationScope`; an unscoped query does not compile.
2. **RLS under an application role that policies apply to.** The API never connects as `service_role`. Scope is set per transaction with `set_config(..., true)` so it is transaction-local and cannot leak across a pooled connection.

Policies express **isolation only** — `organization_id` matching. No business rules, ever.

Cross-Organization access for Platform Admin, Support, and Finance goes through explicitly named methods that write an audit entry **before** returning ([I-09](../03-domain/invariants.md#i-09--privileged-access-is-always-logged)).

## Consequences

**Good**

- A bug in application scoping still returns nothing rather than another Organization's data.
- Transaction-local settings close the pooled-connection leak, which is the specific way RLS-plus-pooling fails quietly.
- Policies stay reviewable: one rule, one column, no product logic buried in SQL.

**Bad, accepted**

- Duplicated intent, and a class of bug where the two layers disagree and a legitimate query returns empty. Preferable to the alternative failure.
- Every transaction pays two `set_config` calls.
- Migrations must add a policy for every new Organization-scoped table, and forgetting one is silent — so [10-testing](../10-testing/) inherits a test that every such table has a policy.

## Alternatives

| Rejected | Why |
|---|---|
| **`service_role` + application scoping only** | One layer wearing a costume of two. The most common way this platform is misused |
| **RLS only, clients direct** | Prohibited by [ADR-0001](0001-supabase-api-mediated.md) — policies cannot express the invariants |
| **Schema or database per Organization** | Real isolation, and a migration story that multiplies by Organization count. Wrong shape for a marketplace with cross-Organization search |

## Revisit when

RLS overhead becomes measurable on read-heavy paths, or connection pooling is replaced by something with different session semantics.
