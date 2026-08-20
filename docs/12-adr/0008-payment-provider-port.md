# ADR-0008 — Payments behind a port; provider choice deferred

**Status:** Accepted · **Date:** 2026-08-20 · **Deciders:** Step 3

## Context

V1 accepts GCash, Maya, and cards, plus cash recorded by staff (D-08). [payments-overview.md](../00-overview/payments-overview.md) explicitly deferred provider choice, webhook verification, and idempotency mechanics to later steps, and fixed one thing: **recording an offline payment is not payment processing** (D-09).

Provider selection depends on commercial terms nobody has yet.

## Decision

**A `PaymentGateway` port with a narrow surface**: start a payment, confirm one from a webhook, refund one. No provider name appears in the domain, the schema, or the API contract.

**Offline recordings never touch the port.** There is nothing to call — staff attest that cash changed hands. This is structural, not conventional: the two live in different slices ([vertical-slice.md](../02-architecture/vertical-slice.md)).

Webhooks are verified by signature and applied **idempotently by provider event id**, because providers retry and a double-applied payment is a refund conversation.

## Consequences

**Good**

- Provider selection stays a commercial decision, made late, without blocking the domain.
- The `ONLINE` / `OFFLINE_RECORDED` distinction is enforced by which code path exists at all, not by a flag someone could set wrongly ([I-08](../03-domain/invariants.md#i-08--payment-origin-is-immutable)).
- Reconciliation compares provider settlements against `ONLINE` ledger entries only — offline entries have no provider side, and including them would produce a reconciliation that never balances and therefore nobody reads.

**Bad, accepted**

- The port must be narrow enough to fit providers we have not chosen, so provider-specific features are unavailable until deliberately adopted.
- A sandbox provider is needed for staging before the real one is selected.

## Alternatives

| Rejected | Why |
|---|---|
| **Pick a provider now and integrate directly** | Commercially premature, and it would put a provider's vocabulary into the domain |
| **A payments aggregator** | An extra party, extra fees, and an abstraction over an abstraction |
| **Treat offline recordings as payments through a null provider** | Would make the two indistinguishable at exactly the layer D-09 exists to keep separate |

## Revisit when

Commercial terms are agreed — at which point a provider adapter is written and this ADR is superseded by one that names it.
