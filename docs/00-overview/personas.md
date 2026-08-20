# Personas

> **Status:** Written
> **Owner step:** Step 1 — Product Definition
> **Last updated:** 2026-08-18
> **Depends on:** [glossary.md](glossary.md), [product-decisions.md](product-decisions.md)
> **Informs:** all journey documents in [01-product](../01-product/), [roles-and-permissions.md](../01-product/roles-and-permissions.md)

Eight personas. Each gets its own entry — **Owner and Tenant emphatically separately** (D-16).

## One person, several personas

A persona is a **role someone is playing**, not a type of human being. One real person can hold several at once, and the product must never assume otherwise:

```
                    User account
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    Customer          Tenant           Owner
  capabilities     capabilities     capabilities
```

Real cases this must handle:

- **Ana** rents Condo 101 (Tenant) while browsing apartments near her new office (Customer). She is both, simultaneously. Becoming a tenant did not stop her being a customer (D-15).
- **Mr. Santos** owns three buildings (Owner) and rents a condo in Manila for his daughter (Customer, then Tenant of someone else's Organization).
- **Marco** is Staff at Santos Property Holdings and also a Tenant in one of its bed spaces.

None of these require a second account. Capabilities are additive.

---

## Customer

**Finding a place to rent.**

> **Liza, 24, call-center agent, Cebu.** Relocating for a new job, needs a bed space or small room near IT Park under ₱5,000. Searches on her phone during breaks. Has been burned twice by Facebook posts with year-old photos.

| | |
|---|---|
| **Primary surface** | Customer mobile app |
| **Goals** | Find something real, affordable, and near work — without spending days travelling to viewings |
| **Pains** | Stale listings; "sorry, taken na"; photos that hide the actual condition; no way to compare; unclear total cost |
| **Touches** | Search, filters, listing detail, **interactive virtual tour**, availability, booking, application, payment, notifications |
| **Success** | Signs a lease or books a stay having visited in person once, or not at all |

**What matters most:** trust. Every feature that lets her verify a place from her phone — the virtual tour above all — reduces the number of wasted trips, which is the real cost of renting in the Philippines.

---

## Tenant

**Living somewhere, paying rent.** Distinct from Owner in every respect (D-16).

> **Ana, 29, nurse, Cebu.** Renting Unit 203 at ₱8,500/month for eight months. Pays sometimes by GCash, sometimes in cash to the caretaker when she is on night shift. Has no reliable record of either.

| | |
|---|---|
| **Primary surface** | Tenant mobile app and tenant web |
| **Goals** | Know what she owes and when; pay easily; have proof she paid; get things fixed |
| **Pains** | No receipt for cash; disputes about whether last month was paid; maintenance requests lost in a group chat; no copy of her own lease |
| **Touches** | Lease details, invoices, online payment, receipts for both online and cash, documents, maintenance requests, notifications, renewal and move-out |
| **Success** | Never has to argue about whether she paid |

**What matters most:** receipts and record. The cash path being first-class — staff records it, she gets a receipt in the app — is what makes the platform trustworthy for the majority of Philippine tenants (D-08).

---

## Property Owner

**Owns the inventory. Carries the risk.** The Organization's principal.

> **Mr. Santos, 58, Cebu.** Owns two apartment buildings (22 units) and a boarding house near a university (40 bed spaces). Tracks rent in a notebook and three Messenger threads. Cannot say who is behind on rent without an hour of reconstruction.

| | |
|---|---|
| **Primary surface** | Owner web (management), owner mobile (on the go) |
| **Goals** | Keep resources occupied; collect rent reliably; know his financial position at a glance; spend less time on admin |
| **Pains** | No single view of who owes what; vacancy he learns about late; listings he forgets to take down; no records when a dispute arises |
| **Touches** | Organization setup and verification, properties, buildings, floors, rentable resources, media and virtual tours, listings, bookings, applications and approvals, leases, invoices, payments, reports, staff management |
| **Success** | Answers "who owes me money this month?" from the platform, without the notebook |

**What matters most:** the collection picture. Occupancy and rent collection are the two numbers he actually cares about; everything else is means.

**Onboarding reality:** he signs up himself (D-10), but cannot publish until the platform verifies his Organization (D-11). He can do all setup work while waiting — that gap must not feel like being blocked.

---

## Property Manager

**Runs properties on the Owner's behalf.** Broad authority, but not the principal.

> **Grace, 41, Cebu.** Manages Mr. Santos's boarding house full-time. Handles viewings, screens applicants, chases late rent, coordinates repairs. Makes most day-to-day decisions without asking.

| | |
|---|---|
| **Primary surface** | Owner web (management), owner mobile |
| **Goals** | Keep the place full and running; not escalate every small decision |
| **Pains** | Semester turnover of 40 bed spaces by text message; chasing rent with no record of who was reminded; repairs falling through the cracks |
| **Touches** | Properties and resources, listings, bookings, applications and approvals, leases, invoices, recording payments, maintenance, tenant communication, reports for the owner |
| **Success** | Turns over a semester's bed spaces without a spreadsheet |

**Where her authority stops:** she operates the business but does not *own* it. Financial authority (refunds), organization-level settings, and staff management are the Owner's. Exactly how far a manager's listing authority extends is [U-03](product-decisions.md#unresolved).

---

## Staff

**Limited, day-to-day operational access.**

> **Marco, 33, live-in caretaker.** On site daily. Receives cash rent, lets in repair technicians, notices the leaking faucet before anyone reports it. Uses a basic Android phone.

| | |
|---|---|
| **Primary surface** | Owner mobile app (a narrow slice of it) |
| **Goals** | Do today's job — record the cash he was handed, log the leak, mark the repair done |
| **Pains** | Being the human record-keeper; blamed when cash and memory disagree; too many features in the way of three tasks |
| **Touches** | Assigned resources, **recording offline payments**, maintenance requests, occupancy status |
| **Success** | Records cash the same day, every time, without being chased |

**What matters most:** speed and narrowness. If recording a cash payment takes more than a few taps, he goes back to a notebook and the ledger becomes fiction.

**The trust boundary:** Marco records money he received but did not process (D-09). Every entry carries his name and the time. He is trusted to attest, and audited on it — those are two halves of the same design.

---

## Platform Admin

**Runs the platform. Keeps the marketplace honest.**

> **Platform operations, Manila.** Small team during the pilot. Verifies new organizations, reviews listings, watches for abuse.

| | |
|---|---|
| **Primary surface** | Super Admin web |
| **Goals** | Only real organizations publish; only accurate listings go live; the platform stays trustworthy as it grows |
| **Pains** | Verification backlog blocking legitimate owners; judging listing quality from photos; abuse that only shows up as a pattern |
| **Touches** | Organization verification queue, listing approval and moderation, users, bookings, payments oversight, reports, audit log |
| **Success** | Verification and approval SLAs met, with no bad listings public |

**The tension to hold:** every hour a legitimate owner waits for verification is an hour of lost inventory. Every listing waved through carelessly is the stale-listing problem the product exists to solve. Both approval gates (D-11, D-12) exist for quality and cost latency — the queues need real SLAs, not best effort.

---

## Support

**Assists customers, owners, and tenants when something goes wrong.**

> **Support agent, Manila.** Fields "my payment didn't show up", "the owner isn't responding", "I can't find my lease".

| | |
|---|---|
| **Primary surface** | Super Admin web (support tooling) |
| **Goals** | Understand what happened to a specific user, quickly, and fix or escalate it |
| **Pains** | Cannot see enough to diagnose; or can see too much and handles personal data they should not |
| **Touches** | User lookup, booking and lease history, payment history, maintenance history, ticket context |
| **Success** | Resolves a payment question without escalating to engineering |

**The constraint:** support needs visibility, not impersonation. Reading a user's rental history to answer their question is the job; acting *as* them is not, and every access is logged. Where exactly that line sits is Step 3's security work.

---

## Finance

**Payment operations and reconciliation.**

> **Finance operations, Manila.** Reconciles provider settlements against platform records, investigates mismatches, handles refunds and disputes.

| | |
|---|---|
| **Primary surface** | Super Admin web (finance tooling) |
| **Goals** | Every peso the platform claims to have processed matches what the provider says |
| **Pains** | Mismatches with no explanation; refunds with no trail; being unable to tell processed money from recorded cash |
| **Touches** | Payment records, provider settlement data, refunds, disputes, financial reports, audit log |
| **Success** | Reconciliation balances, and every exception has a documented cause |

**Why this persona exists in Step 1 at all:** finance is the reason [payments-overview.md](payments-overview.md) insists that recorded offline payments are not processed payments (D-09). Reconciling online payments against a provider is possible. Reconciling cash Marco wrote down is not — it can only be audited. Mixing them would make the finance job undoable, so the distinction is a product requirement, not an implementation detail.

---

## Persona-to-surface map

Surfaces are described in [product-scope.md](product-scope.md#product-surfaces). Grouping is packaging only — **Owner and Tenant remain distinct actors** (D-16).

| Persona | Primary surface | Also uses |
|---|---|---|
| Customer | Customer mobile app | Public web listings |
| Tenant | Tenant mobile app | Tenant web |
| Property Owner | Owner web | Owner mobile |
| Property Manager | Owner web | Owner mobile |
| Staff | Owner mobile (narrow) | — |
| Platform Admin | Super Admin web | — |
| Support | Super Admin web | — |
| Finance | Super Admin web | — |

## Personas explicitly out of scope for V1

| Not a persona in V1 | Why |
|---|---|
| Broker / agent | The platform is not a brokerage ([vision.md](vision.md#what-this-platform-is-not)) |
| Co-tenant with separate billing | A lease may have several tenants; splitting rent between them is V2 |
| Guarantor / co-signer | Documented on an application as an attachment, not modelled as an actor |
| Vendor / contractor | Maintenance is coordinated by staff; external contractor accounts are V2 |
| Buyer / seller | No sales. Rental only |
