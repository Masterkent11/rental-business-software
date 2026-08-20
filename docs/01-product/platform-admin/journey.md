# Platform Admin, Support & Finance Journey

> **Status:** Written
> **Owner step:** Step 1 — Product Definition
> **Last updated:** 2026-08-18
> **Depends on:** [personas.md](../../00-overview/personas.md), [payments-overview.md](../../00-overview/payments-overview.md)
> **Informs:** Super Admin web scope, [roles-and-permissions.md](../roles-and-permissions.md), [08-security/audit-logging](../../08-security/)

**Actors:** Platform Admin (marketplace governance), Support (user assistance), Finance (payment operations).
**Primary surface:** Super Admin web.

These three run the platform itself. They sit **outside every Organization** and are the only actors who see across the isolation boundary (D-13) — which is exactly why their access is the most tightly audited in the product.

---

## Platform Admin

Keeps the marketplace honest. Owns both quality gates.

### The two gates

They are different things and must never be conflated ([glossary.md](../../00-overview/glossary.md#approval)):

| Gate | Decides | Blocks | Frequency |
|---|---|---|---|
| **Organization verification** (D-11) | Is this a real business with the right to rent this out? | Publishing *anything* | Once per organization |
| **Listing approval** (D-12) | Is this specific listing accurate and acceptable? | That listing going public | Every listing |

```
Owner signs up
     │
     ▼
Organization created
     │
     ▼
┌─────────────────────────┐
│ VERIFICATION QUEUE      │  ← Platform Admin
└─────────────────────────┘
     │
     ├── Rejected ──▶ reason returned; owner may resubmit
     ▼
Verified
     │
     ▼
Owner builds and submits listings
     │
     ▼
┌─────────────────────────┐
│ LISTING APPROVAL QUEUE  │  ← Platform Admin
└─────────────────────────┘
     │
     ├── Rejected ──▶ specific reason; owner revises
     ▼
PUBLISHED
```

### Verification queue

| | |
|---|---|
| **Sees** | Pending organizations with submitted business and ownership documents |
| **Does** | Verifies, rejects with a reason, or requests more information |
| **Needs** | Enough context to decide quickly, and a documented basis for the decision |

**The tension to hold:** every hour a legitimate owner waits is an hour of inventory not earning, and churn risk ([product-scope.md](../../00-overview/product-scope.md#risk-3--two-approval-gates-create-latency)). Every organization waved through carelessly is a fraudulent listing on a marketplace built to solve exactly that.

Mitigated in product design: owners can build everything while waiting ([owner/journey.md](../owner/journey.md#stage-2--verification)). That reduces the cost of latency — it does not remove it. **The queue needs a real SLA from day one**, not best effort.

### Listing approval queue

| | |
|---|---|
| **Sees** | Submitted listings with photos, virtual tour, price, terms, and the resource behind them |
| **Does** | Approves, rejects with a specific reason, or requests changes |
| **Judges** | Accuracy, completeness, honest pricing (including total move-in cost), acceptable content |

**Rejection reasons must be actionable.** "Rejected" alone converts a quality gate into an obstacle: the owner cannot fix what they cannot identify, and resubmits blind — costing the admin the same review twice.

**The scaling reality:** manual review of every listing does not scale past the pilot. It is right for V1 because early marketplace quality determines whether the platform is trusted at all. Trust-based auto-approval for established organizations is a V2 conversation, and should be entered deliberately rather than by quietly letting the queue lapse.

### Moderation

| | |
|---|---|
| **Does** | Reviews reported listings; unpublishes; suspends organizations for abuse |
| **Sees** | Reports, history, and patterns across organizations |

Some abuse is only visible in aggregate — the same resource listed by two organizations, prices that change after approval, listings that never come down.

### Platform oversight

Organizations, users, bookings, payments, listings, and platform-wide reports — read access across the platform for governance, plus the audit log ([08-security](../../08-security/)).

---

## Support

Helps customers, owners, and tenants when something breaks.

> Fields "my payment didn't show up", "the owner isn't responding", "I can't find my lease".

| | |
|---|---|
| **Sees** | User lookup; a user's bookings, leases, payments, maintenance, and notifications |
| **Does** | Diagnoses, explains, escalates; corrects nothing financial directly |
| **Needs** | Enough visibility to answer without escalating to engineering |

### The most common ticket

**"I paid but the app says I owe."** Almost always the offline recording gap ([tenant/journey.md](../tenant/journey.md#stage-3--paying-rent)): the tenant handed cash to Marco, and Marco has not recorded it yet.

Support must be able to see:

| | |
|---|---|
| The invoice and its state | |
| All payments against it | online and recorded |
| **Who recorded each offline payment, and when** | the attestation trail (D-09) |
| When the payment was expected | |

Without the attester and timestamp, Support cannot distinguish "not yet recorded" from "recorded wrong" from "never paid" — three situations with completely different answers. This is precisely why offline recordings carry who and when.

### The access constraint

> **Support needs visibility, not impersonation.**

Reading a user's rental history to answer their question is the job. Acting *as* them is not. Every access is logged — support looking at a tenant's payment history is a legitimate action that must still leave a trace.

Exactly where that line sits, and how it is enforced, is Step 3's security work ([08-security](../../08-security/)). Step 1 fixes the requirement: **broad read, minimal write, everything audited.**

---

## Finance

Payment operations and reconciliation.

### Reconciliation — and why the online/offline split exists

```
PLATFORM RECORDS                    PROVIDER SETTLEMENT
       │                                    │
       │  online payments only              │
       └──────────────┬─────────────────────┘
                      ▼
                  MUST MATCH
                      │
                      ▼
              Exceptions investigated


OFFLINE RECORDINGS ──▶ nothing to reconcile against
                       cash has no provider side
                       AUDITED, not reconciled
```

This is the operational reason for D-09 ([payments-overview.md](../../00-overview/payments-overview.md#why-this-matters-more-than-it-looks)). Reconciliation compares platform records against what the provider actually settled. **Offline recordings have no provider side.** Including them would make the comparison permanently fail to balance — and a reconciliation that never balances is one nobody reads, which means real mismatches go unnoticed.

So: online payments are **reconciled**. Offline recordings are **audited**. Different evidence, different process, and the platform must never blur them.

| | |
|---|---|
| **Sees** | Payment records by kind; provider settlement data; mismatches; refunds; disputes |
| **Does** | Runs reconciliation; investigates exceptions; processes refunds and disputes; produces financial reports |
| **Needs** | Every exception to have a documented cause |

### Refunds and disputes

| | |
|---|---|
| Online refund | Processed through the provider; the platform moves money back |
| Offline refund | Recorded as a ledger entry; a human returned cash |
| Dispute | Resolved from the trail — provider record for online, attestation for offline |

**Nobody edits the ledger.** Corrections are new entries referencing the original. This is a product requirement, not just an implementation preference ([payments-overview.md](../../00-overview/payments-overview.md#who-may-do-what)).

---

## The three compared

| | Platform Admin | Support | Finance |
|---|---|---|---|
| Verify organizations | **Yes** | No | No |
| Approve / reject listings | **Yes** | No | No |
| Moderate and suspend | **Yes** | No | No |
| Look up any user | Yes | **Yes** | Yes |
| View bookings and leases | Yes | **Yes** | Yes |
| View payments | Yes | Yes | **Yes** |
| Run reconciliation | No | No | **Yes** |
| Process refunds | No | No | **Yes** |
| View audit log | **Yes** | Limited | Yes |
| Act as a user | **No** | **No** | **No** |
| Change an Organization's data | No | No | No |

The last two rows apply to all three. Platform roles govern, assist, and reconcile. **They do not operate an Organization's business** — that is the Owner's, and the boundary holds even for admins.

---

## What platform roles can never do

| Cannot | Why |
|---|---|
| Impersonate a user | Support needs visibility, not identity |
| Edit or delete ledger entries | Append-only, for everyone |
| Approve an application on an owner's behalf | Letting decisions belong to the Organization |
| Create or edit listings for an organization | They approve; they do not author |
| Access anything without it being logged | Cross-organization access is the most sensitive in the product |

---

## States the admin surface must handle

- **Empty queues.** Healthy, not broken.
- **Queue backlog.** Aging items surfaced against SLA — the metric that predicts owner churn.
- **Repeat rejection.** An organization resubmitting the same deficient documents; needs clearer guidance, not another rejection.
- **Reconciliation mismatch.** Must distinguish "provider says settled, platform disagrees" from "offline recording, nothing to reconcile" — collapsing these is the failure mode D-09 exists to prevent.
- **Suspended organization with active leases.** Real tenants live there. Suspension cannot orphan them, and this needs a deliberate policy before it happens.
- **Support looking at sensitive data.** Legitimate and logged; the log must be reviewable.
