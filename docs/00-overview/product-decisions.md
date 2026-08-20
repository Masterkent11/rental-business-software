# Product Decisions

> **Status:** Written
> **Owner step:** Step 1 — Product Definition
> **Last updated:** 2026-08-20
> **Depends on:** nothing — this is the root register
> **Informs:** every other document and every implementation phase

This is the **canonical decision register**. Any decision stated anywhere else in `docs/` must match this file. Where they disagree, this file wins and the other document is corrected.

Three statuses, and they mean different things:

| Status | Meaning | May a later step change it? |
|---|---|---|
| **Locked** | Decided. Consequences accepted. | Only if a genuine contradiction is discovered. Raise it; do not resolve it silently. |
| **Deferred** | Decided *not* to do it now. The decision is real; the timing is later. | No — it is already decided. Reopening it means re-scoping V1. |
| **Unresolved** | Genuinely open. Nobody has decided yet. | Yes — that is the point. It must be decided by the step named, explicitly. |

The dangerous status is **Unresolved**. An unresolved question that gets silently answered by an implementation detail is how architectures go wrong. If you find yourself needing an answer to one, stop and ask.

---

## Locked

| # | Decision | Consequence |
|---|---|---|
| D-01 | Documentation is written in **English only** | Serves as source of truth for humans and coding agents alike; no translation drift |
| D-02 | **Philippines only** for V1 | PHP currency, PH address format, PH payment rails, PH lease norms (advance + deposit). Locale, currency, and address handling are not abstracted for other countries in V1 |
| D-03 | **Long-term residential lease** is a V1 rental type | Requires application, approval, lease, recurring invoicing, rent collection |
| D-04 | **Rooms and bed spaces** are V1 rental types | A rentable resource may be a sub-unit; `Bed A` is a first-class rentable thing, not an attribute of a room |
| D-05 | **Parking and storage** are V1 rental types | Rentable resources are generic; they are not assumed to be habitable dwellings |
| D-06 | **Short-term nightly** is a V1 rental type | Date-range availability, nightly pricing, prepaid stays, and a lifecycle path that has no lease. Largest single scope multiplier in V1 — see [product-scope.md](product-scope.md#scope-risks) |
| D-07 | **Interactive Virtual Tour ships in V1** | 360° scenes with scene-to-scene hotspot navigation, on the V1 critical path. Supersedes an earlier call to defer it to V2 |
| D-08 | **Hybrid payments**: online provider + staff-recorded offline | Both land in one ledger. Cash-paying tenants are first-class, not a workaround |
| D-09 | **Recording an offline payment is not payment processing** | The platform did not touch the money. Drives later reconciliation, audit, and financial-control design — see [payments-overview.md](payments-overview.md) |
| D-10 | **Owners self-register** | Anyone can sign up and create an Organization without platform intervention |
| D-11 | **Organizations require platform verification** | An unverified Organization may build everything but publish nothing |
| D-12 | **Listings require admin approval before publishing** | No immediate public publishing. Protects marketplace quality; costs an approval queue and its SLA |
| D-13 | **Organization is the SaaS isolation boundary** | The word *tenant* never refers to platform tenancy — in docs, code, schema, or API. See [glossary.md](glossary.md#the-tenant-rule) |
| D-14 | **Tenant means a person occupying under a lease** | `tenant_id` is a human being. `organization_id` is isolation |
| D-15 | **Customer → Tenant is additive capability, same account** | A user may hold Customer and Tenant capabilities simultaneously. Never modelled as a one-way transition that removes Customer status |
| D-16 | **Owner and Tenant are distinct actors** | Separate journeys, capabilities, personas. Grouping their client surfaces is packaging convenience only; they are never one combined role |
| D-17 | **Rental modes exist as a product concept**: `LONG_TERM`, `SHORT_TERM`, `HYBRID` | A resource is configured for how it may be rented. The *modelling* of this is Step 2's job, not Step 1's |

---

## Deferred

Decided not to build now. Not open questions.

| # | Deferred item | Target | Why now is wrong |
|---|---|---|---|
| D-18 | Floor-plan tour navigation | V2 | Needs floor-plan assets most PH owners do not have; the scene selector covers wayfinding in V1 |
| D-19 | Guided tour paths | V2 | Authoring burden on owners before we know if tours convert |
| D-20 | AI-generated virtual tours | V2+ | Depends on tour data we will not have until V1 runs |
| D-21 | Voice narration in tours | V2 | Production cost per listing; unproven value |
| D-22 | VR headset support | Future | Negligible PH device penetration in the target market |
| D-23 | Advanced tour analytics | V2 | Basic view counts suffice to judge whether tours matter at all |
| D-24 | Dynamic / seasonal pricing | V2 | Short-term V1 ships flat nightly rates plus manual date overrides |
| D-25 | Multi-country support | Future | Every abstraction we add for it in V1 is speculative — see D-02 |
| D-26 | Owner-to-owner or agency hierarchies | Future | One Organization, one set of properties, in V1 |
| D-27 | In-platform tenant screening / credit checks | Future | Requires PH data-source partnerships and heavy privacy work |

---

## Unresolved

**Must not be answered by implementation.** Each names the step that owns it.

*None currently open.* U-01 … U-05 were resolved by Step 2 on 2026-08-20 and are recorded below. New unresolved questions raised by Steps 3–6 are added here.

---

## Resolved by Step 2

These were **Unresolved**. Each was decided explicitly by the Domain Model step, not by an implementation detail. They now carry the weight of **Locked** decisions: changing one means re-scoping, not refactoring.

| # | Question | Decision | Consequence |
|---|---|---|---|
| U-01 | May a single rentable resource participate in **long-term and short-term availability simultaneously**? | **Yes.** One authoritative occupancy timeline per resource. Long-term occupancy state and the short-term nightly calendar are read projections of it, never independent truths. `HYBRID` means "both offers live at once", not "switchable" | Availability reads all go through a projection; overlap checking is tree-shaped over the resource nesting path and must be serializable; maintenance blocks become occupancy. Accepted because mode-switching made the product's own canonical example (*Condo Unit 101*) impossible. See [03-domain/occupancy-model.md](../03-domain/occupancy-model.md) |
| U-02 | Is a **deposit** a payment against an invoice, or a held balance with its own lifecycle? | **A held balance** — a liability the Organization owes back, with states `HELD → PENDING_SETTLEMENT → SETTLED` | The V1 ledger gains a liability concept. Every deposit application must cite an invoice or an inspection finding, so an unexplained deduction is not expressible. Returning a deposit is not a refund. See [03-domain/money-model.md](../03-domain/money-model.md#deposit-as-a-held-balance) |
| U-03 | Can a Property Manager publish a listing without owner sign-off? | **No by default.** A Manager may always prepare, submit for approval, and unpublish. Publishing an approved listing requires an Owner-granted publish-delegation flag on the Organization | Delegation is an explicit Organization setting, off by default. Submission and publication are both attributed to the acting User regardless of the setting. See [03-domain/state-machines.md](../03-domain/state-machines.md#listing) |
| U-04 | Does a short-term **Stay** create any persistent relationship after checkout? | **No tenancy.** The `GUEST` capability lapses at checkout. The Stay itself persists as history on the User account | No `Stay → Lease` relationship exists in the schema — enforcement is structural. Stay history grants nothing and must never be read as tenancy. See [03-domain/entities.md](../03-domain/entities.md#guest) |
| U-05 | Are **maintenance requests** possible against a short-term stay, or long-term leases only? | **Both.** The anchor is Occupancy, not Lease: anyone with an active occupancy may report against the resource, and staff may report with no occupancy at all | One entity, one state machine, differentiated downstream obligations (a guest's issue is fixed or the stay refunded; a tenant's is a landlord obligation over a term). See [03-domain/entities.md](../03-domain/entities.md#maintenance-request) |

> U-01 and U-05 shared a root cause: both were hard while *Lease* was treated as the centre of the model, and both dissolved once **Occupancy** became a first-class concept.

---

## Amendment log

Changes to Locked decisions are recorded here with the reason.

| Date | Change | Reason |
|---|---|---|
| 2026-08-18 | Register created with D-01 … D-27, U-01 … U-05 | Step 1 |
| 2026-08-18 | **Virtual Tour moved from Deferred (V2) to Locked V1** (D-07) | The interactive 360° walkthrough is core to the intended customer experience, not a gallery enhancement. Deferring it would have made the V1 discovery flow materially different from the product being built |
| 2026-08-20 | **U-01 … U-05 moved from Unresolved to Resolved by Step 2** | Step 2 — Domain Model. Each answered explicitly, with consequences recorded in [03-domain](../03-domain/) |
| 2026-08-20 | **Flutter customer app scaffolded ahead of Step 3** ([06-frontend/flutter-toolchain.md](../06-frontend/flutter-toolchain.md)) | Deliberate exception to "no application code before the domain is frozen". Scope is limited to toolchain, structure, and UI shell with fixture data; the app encodes no domain rule, holds no availability logic, and is not a source of truth for anything in [03-domain](../03-domain/). It is re-pointed at real contracts after Step 5 |
| 2026-08-20 | **Step 3 — Architecture written.** ADR-0001 … ADR-0011 accepted ([12-adr](../12-adr/)) | Platform, layering, isolation, identity, and the two decisions Step 2 reserved (ADR-0004, ADR-0005). Supabase is adopted **API-mediated** and on the explicit condition that it remains replaceable |
| 2026-08-20 | **Tenant surface is web, not mobile** ([ADR-0010](../12-adr/0010-web-stack.md)) | Amends the surface table in [product-scope.md](product-scope.md#product-surfaces), which listed tenant mobile as the primary tenant surface. Tenant web ships in V1; **tenant mobile is deferred**, not cancelled. The tenant loop — invoice, pay, receipt, maintenance — is document- and table-shaped and is served well by a responsive web app, and one web stack covers tenant, owner, public listings, and super admin |
| 2026-08-20 | **Next.js tenant web app scaffolded** ([06-frontend/tenant-web.md](../06-frontend/tenant-web.md)) | Same bounded exception as the customer app: UI shell and fixture data only. Balances arrive computed from the server; the client derives no money |
