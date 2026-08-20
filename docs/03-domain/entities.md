# Domain Entities

> **Status:** Written
> **Owner step:** Step 2 — Domain Model
> **Last updated:** 2026-08-20
> **Depends on:** [glossary.md](../00-overview/glossary.md), [occupancy-model.md](occupancy-model.md)
> **Informs:** [relationships.md](relationships.md), [05-database](../05-database/), [04-api](../04-api/)

Every entity in the V1 domain: what it is, what owns it, and what it is responsible for. Names match [glossary.md](../00-overview/glossary.md) exactly.

## Reading this document

- **Aggregate root** — the entity that owns the consistency boundary. Invariants hold synchronously inside it; anything crossing a root is eventually consistent and says so.
- **Scoped by** — `Organization` means the record carries `organization_id` and is invisible across Organizations. `Platform` means it is global.
- Attributes listed are the domain-significant ones, not an exhaustive column list. Columns are Step 4.

---

## Identity and access

### User

An account. One human, one account, for life on the platform.

| | |
|---|---|
| Aggregate root | User |
| Scoped by | Platform — a User is **not** owned by an Organization |
| Identity | `user_id` |

**Attributes:** name, email, mobile number, password credential, verification state of email/mobile, locale, status (`ACTIVE`, `SUSPENDED`).

**Responsibilities:** authentication identity, and the anchor every capability hangs from.

A User is deliberately platform-scoped even though most records are Organization-scoped. Ana can be a tenant of one Organization, a guest of another, and staff at a third, on one login. Attaching users to Organizations would have broken D-15 on day one.

### Capability

What a User may act as. **Additive, never exclusive** (D-15, D-16).

| | |
|---|---|
| Aggregate root | User |
| Scoped by | Organization, except `CUSTOMER` which is platform-wide |

| Capability | Scope | Granted by |
|---|---|---|
| `CUSTOMER` | Platform | Automatic on registration |
| `TENANT` | Organization | A lease becoming active |
| `GUEST` | Organization | A stay being confirmed |
| `OWNER` | Organization | Creating the Organization |
| `PROPERTY_MANAGER` | Organization | Owner invitation |
| `STAFF` | Organization | Owner or Manager invitation |
| `PLATFORM_ADMIN` / `SUPPORT` / `FINANCE` | Platform | Platform Admin |

Capabilities are never removed by another capability being added. A Tenant remains a Customer ([glossary.md](../00-overview/glossary.md#customer)). Capabilities *are* revoked when their cause ends — staff leaving, a lease terminating — and revocation is recorded, never a silent delete.

`TENANT` and `GUEST` are Organization-scoped because being Santos Property Holdings' tenant grants nothing at another Organization.

### Organization

The SaaS isolation boundary (D-13). Every business record in the system belongs to exactly one.

| | |
|---|---|
| Aggregate root | Organization |
| Scoped by | Platform |

**Attributes:** legal name, trading name, PH business identifiers, contact details, verification state, publish-delegation flag (U-03), status.

**Responsibilities:** the isolation boundary; the party to every Lease; the holder of every Deposit Balance; the owner of the ledger.

> The publish-delegation flag is the whole of U-03's answer: `false` by default, meaning a Property Manager may submit a listing for approval but not publish an approved one. Set `true` by the Owner, per Organization. Either way, submission and publication are both attributed to the acting User — see [state-machines.md](state-machines.md#listing).

### Staff Assignment

Which properties a Property Manager or Staff member may act on.

| | |
|---|---|
| Aggregate root | Organization |
| Scoped by | Organization |

Property Managers act "for assigned properties" ([product-scope.md](../00-overview/product-scope.md#property-manager)), so assignment is a domain entity, not a permission-system detail. An Organization-wide assignment is expressible; it is not the default.

### Verification

The platform's check that an Organization may rent out what it lists (D-11).

| | |
|---|---|
| Aggregate root | Organization |
| Scoped by | Platform (decided by Platform Admin) |

**Attributes:** submitted documents, state, reviewing admin, decision reason, decided-at.

Gates publishing only, never setup (D-10, D-11).

---

## Inventory

### Property

A physical property at one address ([glossary.md](../00-overview/glossary.md#property)).

| | |
|---|---|
| Aggregate root | Property |
| Scoped by | Organization |

**Attributes:** name, PH address (barangay, city/municipality, province, ZIP — D-02), geolocation, property type, description, status.

**Not rentable itself.** No Listing may point at a Property.

### Building / Floor

Optional structure within a Property. A single-structure property has one implicit Building.

| | |
|---|---|
| Aggregate root | Property |
| Scoped by | Organization |

Organizational and wayfinding only. Neither is rentable, neither carries price, neither appears on the occupancy timeline.

### Rentable Resource

**The unit of inventory** — the actual thing a person rents (D-04, D-05).

| | |
|---|---|
| Aggregate root | Rentable Resource |
| Scoped by | Organization |

**Attributes:** label (`Unit 203`, `Bed A`), resource type (`UNIT`, `ROOM`, `BED_SPACE`, `PARKING`, `STORAGE`), rental mode (`LONG_TERM` / `SHORT_TERM` / `HYBRID`), parent resource, ancestor path, floor area, capacity, amenities, status (`DRAFT`, `ACTIVE`, `ARCHIVED`).

**Responsibilities:** owning the occupancy timeline; declaring which offers it may carry; carrying the nesting relationship that makes bed spaces work.

**Nesting.** A resource may have a parent resource — `Bed A` inside `Room 101` inside `Unit 203`. The ancestor path is domain-significant, not a convenience: [I-01](invariants.md#i-01--no-overlapping-committed-occupancy) is evaluated over it.

**Not a habitable-dwelling assumption.** A parking slot is a Rentable Resource with no capacity and no bedrooms, and nothing in the model may assume otherwise (D-05).

### Resource Pricing

The rates a resource offers.

| | |
|---|---|
| Aggregate root | Rentable Resource |
| Scoped by | Organization |

**Attributes:** monthly rate, nightly rate, minimum stay nights, nightly date overrides, currency (`PHP`, always — D-02).

Which rates may be set is governed by rental mode. Date overrides are manual only; dynamic and seasonal pricing are deferred (D-24).

---

## Occupancy

### Occupancy

**The one truth about whether a resource is taken.** Fully specified in [occupancy-model.md](occupancy-model.md); summarized here for completeness.

| | |
|---|---|
| Aggregate root | Rentable Resource |
| Scoped by | Organization |

**Attributes:** resource, `[starts_on, ends_on)` in `Asia/Manila`, firmness (`HELD` / `COMMITTED`), `expires_at` (holds only), cause type (`LEASE` / `STAY` / `MAINTENANCE`), cause id.

The aggregate root is the **Resource**, not the Lease or the Stay — that is what makes [I-01](invariants.md#i-01--no-overlapping-committed-occupancy) enforceable synchronously. A Lease that wants to occupy asks the Resource, and the Resource may refuse.

---

## Marketplace

### Listing

The public marketplace representation of a Rentable Resource (D-12).

| | |
|---|---|
| Aggregate root | Listing |
| Scoped by | Organization |

**Attributes:** resource, listing kind (`LONG_TERM` or `SHORT_TERM`), title, description, terms, cover media, published price snapshot, state, approval record, submitted-by, published-by.

**A listing has one kind.** A `HYBRID` resource carries **two** listings — one long-term, one nightly — which is exactly why [glossary.md](../00-overview/glossary.md#listing) insisted the listing is not the resource. They can be worded, priced, and unpublished independently, and only one of them may need re-approval.

A Listing is never the source of availability. It reads the projection.

### Virtual Tour / Scene / Hotspot

The 360° walkthrough (D-07), on the V1 critical path.

| | |
|---|---|
| Aggregate root | Virtual Tour |
| Scoped by | Organization |

- **Virtual Tour** — belongs to a Resource or a Property, has an entry Scene, has a publish state.
- **Scene** — one 360° panorama with a human-readable label and its source asset.
- **Hotspot** — a point in a Scene with spherical coordinates and a kind: `NAVIGATION` (to another Scene), `IMAGE`, `VIDEO`, `INFO`.

A tour with a navigation hotspot pointing at a deleted scene is broken, and the model forbids it ([I-07](invariants.md#i-07--tour-navigation-is-total)). Authoring usability is a V1 requirement, not polish ([product-scope.md](../00-overview/product-scope.md#risk-2--virtual-tour-on-the-critical-path)).

### Media Asset

A photo, video, or 360° panorama.

| | |
|---|---|
| Aggregate root | the entity it is attached to |
| Scoped by | Organization |

**Attributes:** kind, storage reference, dimensions, ordering, alt text, processing state.

360° panoramas need derivative generation before a tour is viewable on a mid-range phone over mobile data, so `processing_state` is domain-visible: a tour cannot publish while its scenes are still processing.

### Favourite / Enquiry / Viewing Request

Pre-commitment customer actions ([product-scope.md](../00-overview/product-scope.md#customer)).

| | |
|---|---|
| Aggregate root | itself |
| Scoped by | Favourite: User · Enquiry and Viewing Request: Organization |

None of these touch the occupancy timeline. A viewing request is an appointment to look at a place, not a claim on it.

---

## Long-term path

### Application

A request to rent long-term (D-03). **Long-term only** (D-06).

| | |
|---|---|
| Aggregate root | Application |
| Scoped by | Organization |

**Attributes:** applicant User, resource, desired move-in date, desired term, attached documents, state, decision reason, deciding User.

**An application places no hold.** Many customers may apply for one resource; approval is what takes it off the market ([occupancy-model.md](occupancy-model.md#worked-example)).

Documents are applicant-supplied evidence only. The platform performs no screening, scoring, or credit check — permanently (D-27, and a non-goal).

### Lease

The long-term agreement between an Organization and one or more Tenants (D-03).

| | |
|---|---|
| Aggregate root | Lease |
| Scoped by | Organization |

**Attributes:** resource, Organization, tenants, start date, end date, monthly rent, advance amount, deposit amount, billing day of month, terms document, state, termination reason, occupancy reference.

**Responsibilities:** generating recurring Invoices; holding the deposit terms; being the cause of exactly one Occupancy.

**Co-tenants:** a Lease may name several Tenants, all jointly responsible. Rent **splitting** between them is V2 — V1 issues one invoice per lease per period.

A Lease never writes availability directly. It asks the Resource for an Occupancy and may be refused.

### Tenant

A person occupying under a Lease (D-14). Not an account — a **capability on a User**, plus the lease relationship.

| | |
|---|---|
| Aggregate root | Lease |
| Scoped by | Organization |

`tenant_id` is a human being; `organization_id` is isolation. This is the rule the entire schema depends on ([glossary.md](../00-overview/glossary.md#the-tenant-rule)).

---

## Short-term path

### Booking

A reservation of specific nights (D-06).

| | |
|---|---|
| Aggregate root | Booking |
| Scoped by | Organization |

**Attributes:** resource, guest User, `[check_in, check_out)`, nights, guest count, quoted total, state, hold expiry, cancellation record.

**A booking holds immediately on creation**, unlike an application — payment follows in minutes, not days.

### Stay

Confirmed short-term occupancy. **No lease, no tenant.**

| | |
|---|---|
| Aggregate root | Booking |
| Scoped by | Organization |

**Attributes:** booking, actual check-in, actual check-out, state, occupancy reference.

### Guest

**This entity answers [U-04](../00-overview/product-decisions.md#resolved-by-step-2).**

A Guest is a User holding the `GUEST` capability for an Organization, for the duration of a confirmed Stay.

> **A Stay creates no persistent tenancy relationship.** At checkout the `GUEST` capability lapses and the User is a Customer again — which they never stopped being (D-15).

What *does* persist is the **Stay itself**, as history: it stays attached to the User account so the guest can see past stays and receipts, and so Support and the Organization can answer "has this person stayed with us before". History is a record of a completed fact. It is not a relationship, it grants nothing, and it must never be read as tenancy.

The distinction is not pedantic. Deposit settlement, recurring invoicing, maintenance obligations, and renewal all attach to tenancy. A guest who stayed two nights in December must not appear anywhere those live — which is exactly the failure [rental-lifecycle.md](../00-overview/rental-lifecycle.md) warns about when short-term is treated as a special case of long-term.

---

## Money

Fully specified in [money-model.md](money-model.md).

### Invoice

An amount owed by a Tenant to an Organization, with a due date. **An invoice is not money** — it is a claim.

| | |
|---|---|
| Aggregate root | Invoice |
| Scoped by | Organization |

**Attributes:** lease, period, line items, total, amount paid, due date, state, issued-at.

Long-term only. A prepaid Stay raises no invoice.

### Payment

Money actually received.

| | |
|---|---|
| Aggregate root | Payment |
| Scoped by | Organization |

**Attributes:** origin (`ONLINE` / `OFFLINE_RECORDED`), amount, method, applied-to (invoice or booking), provider reference *or* recording staff User, received-at, recorded-at, state.

> **Origin is permanent and never inferred** (D-08, D-09). An online payment means the platform processed the money. An offline recording means staff attest cash changed hands and the platform processed nothing. No report may present the second as the first ([payments-overview.md](../00-overview/payments-overview.md)).

### Ledger Entry

The append-only record of a financial event.

| | |
|---|---|
| Aggregate root | Organization |
| Scoped by | Organization |

**Never updated, never deleted.** Corrections are new, opposing entries that reference the original.

### Deposit Balance

**This entity answers [U-02](../00-overview/product-decisions.md#resolved-by-step-2).**

Money the Organization holds and owes back — a liability with its own lifecycle, not a paid invoice.

| | |
|---|---|
| Aggregate root | Lease |
| Scoped by | Organization |

**Attributes:** lease, amount held, amount applied, amount returned, state, settlement record.

Distinct from **advance**, which is prepaid rent and *is* an ordinary invoice line ([glossary.md](../00-overview/glossary.md#deposit)). See [money-model.md](money-model.md#deposit-as-a-held-balance).

### Refund

Money returned — a cancelled booking, or an overpayment.

| | |
|---|---|
| Aggregate root | Payment |
| Scoped by | Organization |

Deposit return is **not** a Refund. It is a Deposit Balance settlement, because the money was never revenue.

---

## Operations

### Maintenance Request

**This entity answers [U-05](../00-overview/product-decisions.md#resolved-by-step-2).**

An operational issue reported against a Rentable Resource.

| | |
|---|---|
| Aggregate root | Maintenance Request |
| Scoped by | Organization |

**Attributes:** resource, reporter User, **occupancy reference (nullable)**, title, description, photos, priority, state, assignee, resolution note.

> **Anchored on Occupancy, not Lease.** Anyone with an active occupancy of a resource may report against it — tenant or guest. Staff may raise one with no occupancy at all, on a vacant resource.

This is why U-05 stopped being difficult. The original question — "can short-term guests file maintenance requests?" — assumed the anchor was a Lease, which forced an awkward yes/no. Anchoring on Occupancy makes the answer fall out: *the person currently in the room can report the leaking faucet*, which is what any owner would expect.

The obligations differ and stay differentiated: a guest's report is fixed or the stay is refunded; a tenant's report is a landlord obligation over a lease term. Same entity, different downstream handling.

### Move-Out Inspection

The end-of-lease condition check that precedes deposit settlement.

| | |
|---|---|
| Aggregate root | Lease |
| Scoped by | Organization |

**Attributes:** lease, inspection date, findings with photos, deductions proposed, inspecting User, tenant acknowledgement.

Deliberately minimal in V1: enough to justify a deduction against the Deposit Balance, not a full condition-report system.

---

## Cross-cutting

### Notification

A rental-context message to a User. Not a general communications platform (a non-goal).

| | |
|---|---|
| Aggregate root | Notification |
| Scoped by | User |

### Audit Log Entry

Who did what, when, to which record.

| | |
|---|---|
| Aggregate root | Audit Log Entry |
| Scoped by | Platform, with an Organization reference |

**Every cross-Organization access is logged** ([02-architecture/README.md](../02-architecture/README.md#constraints-already-fixed-by-step-1)) — a Platform Admin opening an Organization's payments leaves a record. Append-only, like the ledger, and for the same reason.

---

## Entities V1 deliberately does not have

| Not modelled | Why |
|---|---|
| Contractor / Vendor | External contractor accounts are V2 |
| Review / Rating | V2 |
| Utility Meter Reading | Sub-metering is V2 |
| Screening Report | Permanent non-goal (D-27) |
| Currency | PHP only, not abstracted (D-02, D-25) |
| Agency / Owner hierarchy | Deferred (D-26) |
| Conversation / Thread | Messaging beyond rental context is a non-goal |
| Channel / External Sync | Channel-manager sync is V2 |

Each of these is a *decision*, not an omission. Adding one is re-scoping V1.
