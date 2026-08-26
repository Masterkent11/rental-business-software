# 05 — Database

> **Status:** Written (Sprint 1 scope only)
> **Owner step:** Step 4 — Database, sliced per sprint
> **Last updated:** 2026-08-22
> **Depends on:** [03-domain](../03-domain/), [ADR-0006](../12-adr/0006-multi-tenancy-enforcement.md)
> **Informs:** every repository adapter

**Only the tables Sprint 1 uses.** Occupancy, money, and identity arrive with their sprints. A whole-schema migration now would be a guess about tables no story consumes.

## Tables

| Table | Holds |
|---|---|
| `organizations` | The isolation boundary. `state` gates publishing (D-11) |
| `properties` | A physical address. Not rentable itself ([I-13](../03-domain/invariants.md#i-13--a-property-is-not-rentable)) |
| `rentable_resources` | The unit of inventory. Nests via `parent_id`; `root_id` is the materialised ancestor path |
| `listings` | The marketplace representation. One per kind per resource |
| `media_assets` | Photos, panoramas, video |
| `virtual_tours` | Hangs off the **resource**, so a hybrid resource shows one tour on both listings |

### Sprint 2 — identity

| Table | Holds |
|---|---|
| `user_profiles` | The platform's own record of a person. `id` mirrors `auth.users.id` |
| `organization_members` | Membership and role, with `revoked_at` rather than deletion |
| `user_capabilities` | What a person may do **and what makes it true** |
| `saved_listings` | Favourites, following the account rather than the device |

`user_profiles.id` mirrors Supabase's `auth.users.id` with **no foreign key to
it**. The auth schema is Supabase's, and depending on its shape is exactly the
coupling ADR-0001 keeps out of the platform. The id is the contract.

### Sprint 5 — applications and reservations

| Table | Holds |
|---|---|
| `applications` | A request to rent long-term. **Places no hold** |
| `application_documents` | Storage paths only — the bytes are in a private bucket |
| `reservations` | The optional fee that *does* hold a place while the owner decides |

`occupancies.application_id` traces a hold back to what caused it — a
reservation fee, or an approval.

**Two ledger entry types were added** beyond the set `money-model.md` names:
`RESERVATION_FEE_CREDITED` and `RESERVATION_FEE_FORFEITED`. Neither an existing
type nor a combination could say what happens to a reservation fee at the two
moments that matter — credited is a claim the tenant holds against their first
invoice, not a refund and not revenue; forfeited needs the reason attached,
because the reason is what a customer disputes. This is a deliberate extension
to the domain vocabulary and wants sign-off.

`user_capabilities` carries `source_type` and `source_id` — the fact that makes
the capability true. A bare list per user would drift from reality the moment a
lease ended; closing the row that carried the reason keeps the two together. See
[08-security/authn.md](../08-security/authn.md).

## Three decisions worth knowing

### `organization_id` is on every row, directly

Never reached by joining up to the property. Denormalised on purpose: isolation is enforced at the row, so it must be checkable at the row. A policy that walks four joins is one a hurried query will eventually bypass. Composite foreign keys `(id, organization_id)` make a cross-organization reference unrepresentable ([I-02](../03-domain/invariants.md#i-02--no-cross-organization-references)).

### `root_id` exists before anything needs it

Sprint 3's overlap check is tree-shaped — leasing a unit must block the beds inside it ([ADR-0005](../12-adr/0005-occupancy-write-serialization.md)). Adding an ancestor path later, under load, with rows already written, is far worse than carrying an unused column now.

### Money is `bigint` centavos

Never `numeric`, never `float`. `price_centavos` plus a `currency` column fixed to `PHP` — D-02 means no conversion logic, and the column stops a bare integer being ambiguous.

## Row-level security

Enabled on every table. The API connects as **`rental_app`** — `NOSUPERUSER`, `NOBYPASSRLS`. Neither a superuser nor Supabase's `service_role`, both of which bypass policies entirely and would leave one isolation layer pretending to be two ([ADR-0006](../12-adr/0006-multi-tenancy-enforcement.md)).

Scope is set per transaction:

```sql
select set_config('app.organization_id', $1, true);
select set_config('app.user_id', $2, true);
```

Identity is platform-scoped — a user belongs to no organization — so the
identity tables are isolated by user rather than by tenant. Both settings are
transaction-local for the same reason.

The `true` makes it **transaction-local**, so a pooled connection cannot leak one request's scope into the next. That is the specific way this pattern fails quietly, and the third argument is the whole defence.

### Two kinds of policy

| Policy | On | Rule |
|---|---|---|
| `org_isolation` | properties, resources, media, tours | Row belongs to the scoped organization |
| `own_*` | identity tables | Row belongs to the scoped **user** |
| `inventory_public_read` | properties, resources, media, tours | Row currently backs a **published** listing |
| `listings_public_read` | listings | Published, or owned by the scoped organization |

The public-read policies were added in a second migration after a real failure: the marketplace query joins four organization-scoped tables, and with isolation-only policies it returned **zero rows rather than an error**. That is exactly the cost [P-03](../02-architecture/architecture-principles.md#p-03--isolation-is-enforced-twice-independently) names — the two layers disagreeing and a legitimate query coming back empty — and it is still the preferable failure: too tight shows nothing, too loose shows another organization's data.

Unpublishing a listing makes its property, resource, photos, and tour invisible again automatically, because the condition *is* the listing's state.

## Running it locally

Supabase local is the intended stack. Any PostgreSQL 16+ works — which is the point of [ADR-0001](../12-adr/0001-supabase-api-mediated.md), not an accident:

```bash
initdb -D /tmp/rental_pgdata --auth=trust --username=postgres --locale=C
pg_ctl -D /tmp/rental_pgdata -o "-p 55432 -k /tmp" start
psql -h 127.0.0.1 -p 55432 -U postgres -c "create database rental_mvp"
psql -h 127.0.0.1 -p 55432 -U postgres -c \
  "create role rental_app login password 'rental_app' nosuperuser nobypassrls"
psql -h 127.0.0.1 -p 55432 -U postgres -d rental_mvp \
  -f supabase/migrations/20260821000100_listings.sql \
  -f supabase/migrations/20260822000100_public_inventory_read.sql \
  -f supabase/seed.sql
```

Then grant `usage` on schema and `select` on all tables to `rental_app`, and point `DATABASE_URL` at it.

Integration tests skip when `DATABASE_URL` is unset and run when it is set. They are never faked.
