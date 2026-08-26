# Payments — as built

> **Status:** Written (Sprint 4)
> **Owner step:** Step 7 — Integrations
> **Last updated:** 2026-08-22
> **Depends on:** [ADR-0008](../12-adr/0008-payment-provider-port.md), [money-model.md](../03-domain/money-model.md)
> **Informs:** [05-database](../05-database/), [08-security](../08-security/)

Short-term prepayment only. Invoices, deposits, and the offline cash path are
the long-term sprint's.

## No provider is named

`PaymentGateway` has three methods: start a payment, verify a webhook, refund
one. No provider appears in the domain, the schema, or the API contract —
provider choice depends on commercial terms nobody has agreed, and this keeps
that a late decision instead of a blocking one.

`sandboxPaymentGateway` is named in exactly one file: `payments.module.ts`.
Adopting a real provider is a change to one `useFactory`.

### The sandbox is not a no-op

It signs its callbacks with HMAC-SHA256 and verifies them the way a real
provider does. A stub that accepted anything would leave verification and
idempotency undiscovered until the day a provider is chosen — which is the day
they are hardest to get right.

## The flow

```
POST /bookings                  → hold, 60 minutes         (Sprint 3)
POST /bookings/{id}/payment-intent  → provider ref + redirect
   … customer pays …
POST /webhooks/payments         → verify → confirm, once
   ├── payment       PENDING  → SUCCEEDED
   ├── occupancy     HELD     → COMMITTED
   ├── stay          created, owned by the guest
   └── ledger        BOOKING_PREPAID appended
```

All four happen in **one transaction**. A stay without its ledger entry, or a
committed occupancy nobody paid for, are both worse than a failed webhook the
provider will retry.

### The amount is never the client's

`findPayableBooking` prices the stay in the database — nightly rate times nights
from the occupancy's own date range. A client-supplied amount is a client
deciding what to pay.

The webhook's amount is then checked against the recorded payment. A mismatch is
a **400**, not something to reconcile quietly later: it means the two sides
disagree about the price of a stay.

## Idempotency

Providers retry. A double-applied payment is a refund conversation.

```sql
insert into provider_events (provider_event_id, …)
values (…) on conflict (provider_event_id) do nothing
returning provider_event_id
```

Losing the insert *is* the signal: the handler reports what the first delivery
did and returns 200 so the provider stops retrying.

**Why `on conflict` rather than catching the violation:** inside a transaction a
failed statement poisons the whole thing, so the handler could not then read
what the first delivery did. Discovered by writing the test, not by reasoning
about it.

Concurrent deliveries of the same event are tested, not just sequential ones.

## Verification

Four things are checked before anything is written: **signature, JSON validity,
required fields, and integer amount.** An unverified callback is an instruction
from a stranger to mark money as received.

The signature is over the **raw bytes**. A `preParsing` hook keeps them, because
re-serialising parsed JSON does not reliably reproduce what was signed — key
order and whitespace are not guaranteed.

A failed payment leaves the hold alone. The customer may try again before it
expires; cancelling their nights on a declined card would be the platform giving
up on their behalf.

## The ledger

`BOOKING_PREPAID`, tagged `ONLINE`, actor `PROVIDER`, cause the payment.

**Append-only, enforced by trigger.** Not a convention, not a code-review rule,
and not merely a missing `GRANT`:

```sql
create trigger ledger_no_update before update on ledger_entries …
create trigger ledger_no_delete before delete on ledger_entries …
create trigger ledger_no_truncate before truncate on ledger_entries …
```

Verified against a **superuser at a psql prompt**, not just the application
role. Corrections are new, opposing entries referencing the original (D-08).

The application role additionally holds only `SELECT, INSERT` — the grant says
what the trigger enforces, so the intent is visible without reading trigger
definitions.

*(A superuser can still `ALTER TABLE … DISABLE TRIGGER` first. That is an
explicit, auditable act rather than an accident, which is the property being
bought here.)*

Amounts are never negative: direction is the entry type, not a sign.

## RLS, and two capabilities

A webhook has no organization context — it is a provider calling about one
payment. Rather than let that path bypass RLS, leaving the payments table
unprotected for the one code path that writes money, the handler names the row
it may see:

```sql
create policy payment_by_provider_ref on payments for select using (
  provider_ref = nullif(current_setting('app.provider_ref', true), '')
);
```

Set transaction-locally from the **verified** callback. A capability, not a hole.

A guest may also see their own payment (`own_payment`, scoped through the stay).
Without it the receipt renders the stay correctly and the amount as **zero** — a
screen confidently wrong about money, which is worse than one that fails. There
is a regression test.

## Bookings now require sign-in

Sprint 3 placed holds anonymously, which proved I-01 but left bookings nobody
owned: the customer could not see them, and at check-in nobody could say who was
arriving. `POST /bookings` returns **401** without a token and records
`occupancies.held_by`; the stay inherits it.

## Receipts

`GET /me/stays` returns reference, dates, nights, and what was paid — read from
the payment, not recomputed from the listing's current price.

`stateLabel` ("Confirmed", "Checked in", "Completed") and the tab bucket are
**decided server-side**. Three clients deriving them from dates is three chances
to tell a customer something different about the same stay.

## Not built

- **Refunds.** The port method exists and the sandbox no-ops it. Nothing calls
  it, and no `REFUND_ISSUED` entry is ever written.
- **The offline cash path (D-09).** Structurally separate by design — it never
  touches this port. Sprint 5.
- **Reconciliation.** The `ONLINE`-only index is in place; nothing reads it yet.
- **A real provider.** ADR-0008 is superseded when one is chosen.
