# Roles and Permissions — Product Capability Matrix

> **Status:** Written
> **Owner step:** Step 1 — Product Definition
> **Last updated:** 2026-08-18
> **Depends on:** [personas.md](../00-overview/personas.md), all journey documents in this section
> **Informs:** [08-security/rbac.md](../08-security/) — **this document is its requirement**

## What this document is, and is not

This is a **product-level statement of who may do what.** It answers "should Grace be able to issue a refund?" — a business question with a business answer.

It is **not** the technical RBAC design. It does not define roles as data, permission strings, policy evaluation, scoping mechanics, or row-level security. Those are Step 3's job, in [08-security/rbac.md](../08-security/) and [08-security/rls.md](../08-security/).

**The direction of authority matters.** `rbac.md` implements this document. It does not invent policy of its own, and where the technical design cannot express something here, this document is amended deliberately rather than quietly worked around.

## Actors

| Actor | Scope |
|---|---|
| **Customer** | Their own discovery, applications, bookings |
| **Tenant** | Their own lease, invoices, payments, maintenance |
| **Property Owner** | Their entire Organization |
| **Property Manager** | Assigned properties within one Organization |
| **Staff** | Assigned resources within one Organization |
| **Platform Admin** | Cross-organization governance |
| **Support** | Cross-organization read, for assistance |
| **Finance** | Cross-organization payment operations |

Two rules constrain the whole matrix:

- **Customer and Tenant are capabilities on one account** (D-15). A user may hold both simultaneously. They are separate columns because they authorize different things, not because they are different people.
- **Owner and Tenant are distinct actors** (D-16). No row ever grants them the same thing for the same reason.

**Legend:** ● full · ◐ scoped/limited · ○ none

---

## Organization and setup

| Capability | Cust | Tenant | Owner | Mgr | Staff | Admin | Support | Finance |
|---|---|---|---|---|---|---|---|---|
| Create an Organization | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| Submit for verification | ○ | ○ | ● | ○ | ○ | ○ | ○ | ○ |
| **Verify an Organization** | ○ | ○ | ○ | ○ | ○ | **●** | ○ | ○ |
| Suspend an Organization | ○ | ○ | ○ | ○ | ○ | ● | ○ | ○ |
| Change Organization settings | ○ | ○ | ● | ○ | ○ | ○ | ○ | ○ |
| Invite / manage staff | ○ | ○ | ● | ○ | ○ | ○ | ○ | ○ |
| Assign staff to properties | ○ | ○ | ● | ○ | ○ | ○ | ○ | ○ |

Any user may create an Organization — that is what self-serve onboarding means (D-10). Doing so grants them Owner capabilities for it, and does not remove any capability they already had.

**Staff management is the Owner's alone.** A Property Manager cannot invite staff or widen their own access; delegation that can extend itself is not delegation.

## Property and inventory

| Capability | Cust | Tenant | Owner | Mgr | Staff | Admin | Support | Finance |
|---|---|---|---|---|---|---|---|---|
| Create / edit a Property | ○ | ○ | ● | ◐ | ○ | ○ | ○ | ○ |
| Archive a Property | ○ | ○ | ● | ○ | ○ | ○ | ○ | ○ |
| Create / edit Rentable Resources | ○ | ○ | ● | ◐ | ○ | ○ | ○ | ○ |
| Set Rental Mode | ○ | ○ | ● | ◐ | ○ | ○ | ○ | ○ |
| Update occupancy status | ○ | ○ | ● | ◐ | ◐ | ○ | ○ | ○ |
| Upload media | ○ | ○ | ● | ◐ | ○ | ○ | ○ | ○ |
| Author a Virtual Tour | ○ | ○ | ● | ◐ | ○ | ○ | ○ | ○ |

◐ for Manager means assigned properties only; for Staff, assigned resources only.

Staff can mark a resource under maintenance — that is operational reality they observe first — but cannot create or restructure inventory.

## Listings and marketplace

| Capability | Cust | Tenant | Owner | Mgr | Staff | Admin | Support | Finance |
|---|---|---|---|---|---|---|---|---|
| Create / edit a Listing | ○ | ○ | ● | ◐ | ○ | ○ | ○ | ○ |
| Submit for approval | ○ | ○ | ● | ◐ | ○ | ○ | ○ | ○ |
| **Approve / reject a Listing** | ○ | ○ | ○ | ○ | ○ | **●** | ○ | ○ |
| Publish an approved Listing | ○ | ○ | ● | **?** | ○ | ○ | ○ | ○ |
| Unpublish own Listing | ○ | ○ | ● | ◐ | ○ | ○ | ○ | ○ |
| Unpublish any Listing (moderation) | ○ | ○ | ○ | ○ | ○ | ● | ○ | ○ |
| Set availability and pricing | ○ | ○ | ● | ◐ | ○ | ○ | ○ | ○ |
| View published Listings | ● | ● | ● | ● | ● | ● | ● | ● |
| View unpublished Listings | ○ | ○ | ● | ◐ | ○ | ● | ◐ | ○ |

> **?** — whether a Property Manager may publish without owner sign-off is **[U-03](../00-overview/product-decisions.md#unresolved)**, owned by Step 2. It must not be settled by an implementation default.

**Platform Admin approves listings; they never author them.** Governance and authorship stay separate.

## Discovery, applications, bookings

| Capability | Cust | Tenant | Owner | Mgr | Staff | Admin | Support | Finance |
|---|---|---|---|---|---|---|---|---|
| Search and filter listings | ● | ● | ● | ● | ● | ● | ● | ● |
| View a Virtual Tour | ● | ● | ● | ● | ● | ● | ● | ● |
| Save favourites | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| Submit an enquiry | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| Submit an Application (long-term) | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| **Approve / reject an Application** | ○ | ○ | ● | ● | ○ | ○ | ○ | ○ |
| View own applications | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| View applications for own resources | ○ | ○ | ● | ◐ | ○ | ○ | ◐ | ○ |
| Create a Booking (short-term) | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| Cancel own booking | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| Cancel any booking on own resource | ○ | ○ | ● | ◐ | ○ | ○ | ○ | ○ |

A Tenant can apply and book — they are also a Customer (D-15). A short-term booking creates a Stay, never a Lease or a Tenant ([rental-lifecycle.md](../00-overview/rental-lifecycle.md#path-b--short-term-stay)).

**Application approval is a letting decision** and belongs to the Organization. Platform Admin cannot approve on an owner's behalf.

## Leases and tenancy

| Capability | Cust | Tenant | Owner | Mgr | Staff | Admin | Support | Finance |
|---|---|---|---|---|---|---|---|---|
| Issue a Lease | ○ | ○ | ● | ● | ○ | ○ | ○ | ○ |
| View own lease | ○ | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| View leases on own resources | ○ | ○ | ● | ◐ | ○ | ○ | ◐ | ◐ |
| Renew a Lease | ○ | ◐ | ● | ● | ○ | ○ | ○ | ○ |
| Terminate a Lease | ○ | ◐ | ● | ● | ○ | ○ | ○ | ○ |
| Edit a signed Lease | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |

◐ for Tenant means *request* — a tenant may request renewal or give notice, but cannot unilaterally change the agreement.

**Nobody edits a signed lease.** It is an agreement between parties, not a form. Changes are amendments or a new lease.

## Money

The most authority-sensitive section. See [payments-overview.md](../00-overview/payments-overview.md).

| Capability | Cust | Tenant | Owner | Mgr | Staff | Admin | Support | Finance |
|---|---|---|---|---|---|---|---|---|
| Raise an Invoice | ○ | ○ | ● | ● | ○ | ○ | ○ | ○ |
| View own invoices | ○ | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| View invoices on own resources | ○ | ○ | ● | ◐ | ○ | ○ | ◐ | ◐ |
| **Waive an Invoice** | ○ | ○ | **●** | ○ | ○ | ○ | ○ | ○ |
| Pay online | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| **Record an offline payment** | ○ | **○** | ● | ● | **●** | ○ | ○ | ○ |
| View own payments and receipts | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| View payments on own resources | ○ | ○ | ● | ◐ | ○ | ○ | ◐ | ◐ |
| **Issue a refund** | ○ | ○ | **●** | **○** | **○** | ○ | ○ | **●** |
| **Settle a deposit** | ○ | ○ | **●** | ○ | ○ | ○ | ○ | ○ |
| Run reconciliation | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● |
| Handle a dispute | ○ | ○ | ◐ | ◐ | ○ | ◐ | ◐ | ● |
| **Edit or delete a ledger entry** | **○** | **○** | **○** | **○** | **○** | **○** | **○** | **○** |

Four rules this table encodes:

**1. A tenant can never record their own payment.** A person cannot attest to their own cash (D-09). This is why the offline path requires staff.

**2. Recording money in is operational; giving money back is financial.** Staff and Managers record payments; only the Owner (and platform Finance) refunds. Waivers and deposit settlements are Owner-only for the same reason.

**3. Nobody edits the ledger — including Platform Admin.** Corrections are new entries referencing the original. This is the one row where every column is ○, and that is deliberate.

**4. Every offline recording carries who and when.** It is an attestation, and an attestation without an attester is worthless — it is what makes Support able to answer "I paid but the app says I owe" ([platform-admin/journey.md](platform-admin/journey.md#the-most-common-ticket)).

## Maintenance

| Capability | Cust | Tenant | Owner | Mgr | Staff | Admin | Support | Finance |
|---|---|---|---|---|---|---|---|---|
| Submit a request | ○ | ● | ● | ● | ● | ○ | ○ | ○ |
| View own requests | ○ | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| View requests on own resources | ○ | ○ | ● | ◐ | ◐ | ○ | ◐ | ○ |
| Assign a request | ○ | ○ | ● | ● | ○ | ○ | ○ | ○ |
| Update status | ○ | ○ | ● | ● | ● | ○ | ○ | ○ |
| Resolve / close | ○ | ◐ | ● | ● | ● | ○ | ○ | ○ |
| Reopen | ○ | ● | ● | ● | ○ | ○ | ○ | ○ |
| Delete a request | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |

Whether short-term guests may submit requests is [U-05](../00-overview/product-decisions.md#unresolved).

Requests are never deleted — they are operational records.

## Reports and audit

| Capability | Cust | Tenant | Owner | Mgr | Staff | Admin | Support | Finance |
|---|---|---|---|---|---|---|---|---|
| Occupancy report | ○ | ○ | ● | ◐ | ○ | ● | ○ | ○ |
| Collection report | ○ | ○ | ● | ◐ | ○ | ● | ○ | ● |
| Maintenance report | ○ | ○ | ● | ◐ | ○ | ● | ○ | ○ |
| Platform-wide reports | ○ | ○ | ○ | ○ | ○ | ● | ○ | ● |
| View audit log | ○ | ○ | ◐ | ○ | ○ | ● | ◐ | ● |

◐ for Owner on the audit log means their own Organization's activity — including who recorded which offline payment.

**Collection reports must distinguish processed money from recorded cash** (D-09). A report presenting them identically misrepresents what the platform knows.

## Cross-organization access

| Capability | Owner | Mgr | Staff | Admin | Support | Finance |
|---|---|---|---|---|---|---|
| See another Organization's data | ○ | ○ | ○ | ● | ● | ◐ |
| Act on another Organization's data | ○ | ○ | ○ | ◐ | ○ | ◐ |
| **Impersonate a user** | ○ | ○ | ○ | **○** | **○** | **○** |

**Organization is the isolation boundary** (D-13). Only platform roles cross it, only for governance, assistance, or reconciliation, and **every crossing is logged**.

Platform Admin's ◐ for acting means moderation actions only — verify, approve, unpublish, suspend. Never operating the business: no approving applications, no issuing leases, no authoring listings.

**Nobody impersonates a user.** Support needs visibility, not identity ([platform-admin/journey.md](platform-admin/journey.md#the-access-constraint)).

---

## Universal rules

Regardless of role:

| Rule | Source |
|---|---|
| Nobody edits or deletes a ledger entry; corrections are new entries | D-09 |
| Nobody impersonates another user | [platform-admin/journey.md](platform-admin/journey.md#the-access-constraint) |
| Nobody edits a signed lease | Agreements are not forms |
| Nobody deletes a maintenance request | Operational record |
| A person cannot attest to their own cash payment | D-09 |
| Every offline payment recording carries who and when | D-09 |
| Every cross-organization access is logged | D-13 |
| Data belongs to exactly one Organization | D-13 |

## Open questions this document surfaces

| # | Question | Owned by |
|---|---|---|
| [U-03](../00-overview/product-decisions.md#unresolved) | May a Property Manager publish a listing without owner sign-off? | Step 2 |
| [U-05](../00-overview/product-decisions.md#unresolved) | May short-term guests submit maintenance requests? | Step 2 |

## Note for Step 3

When `08-security/rbac.md` is written, it implements this matrix. If the technical design cannot express something here — scoped `◐` access, or the append-only ledger constraint — **the answer is not to weaken the product rule.** It is to raise the conflict and amend this document deliberately, recording the change in [product-decisions.md](../00-overview/product-decisions.md#amendment-log).
