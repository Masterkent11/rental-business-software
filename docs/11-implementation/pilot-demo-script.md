# Pilot demonstration script

> **Status:** Written (Sprint 7)
> **Owner step:** Step 6 — Implementation
> **Last updated:** 2026-08-27
> **Depends on:** [mvp-roadmap.md](mvp-roadmap.md)

Two short scripts — customer, then owner — for someone who did not build the
system to demonstrate the pilot end to end. Nothing here needs internal
knowledge of the codebase; every step is something visible on a phone or in a
browser.

Sprint 6.4 (the Android performance gate) is **not** part of this script. It
is a separate, device-specific measurement — see
[07-integrations/media.md](../07-integrations/media.md#story-64--the-gate-is-unverified).

---

## Customer — on a phone, in the Flutter app

1. **Sign in.** Open the app, sign in with email and password (or mobile
   OTP). Close the app and reopen it — you are still signed in.
2. **Find a real listing.** On Discover, scroll the results. Every price,
   photo, and "worth a walkthrough" badge is read from the database, not
   made up on the phone.
3. **See honest availability.** Open a nightly listing, tap **Check dates**.
   The calendar shows real blocked nights — try selecting over a blocked one
   and the picker refuses it.
4. **Walk the 360° tour.** From a listing with a tour badge, tap **Walk
   through it**. Drag to look around; tap a glowing hotspot to move to
   another room.
5. **Book.** Pick two open, adjoining nights and tap **Book and pay in
   full**. This places a real hold — the same booking a second phone could
   not also get for those nights.
6. **Pay in the sandbox.** The checkout screen shows nights, rate, and total,
   all priced by the server. Tap **Pay ₱…**. There is no real payment
   provider in the pilot (see the box below) — this triggers the sandbox's
   signed success callback through the same verification path a real
   provider's webhook would use.
7. **See the booking confirmation.** Paying lands you directly on the
   booking's detail screen: check-in/check-out dates, the address, and what
   was paid — read from the payment, not recomputed from today's price.
8. **Open it again from the list.** Go to the Bookings tab; the same stay is
   there under "Active." Tapping it opens the same real detail screen.
9. **Submit a monthly application.** Open a long-term listing, tap **Apply to
   rent**, pick a move-in date and occupant count, attach at least one
   document, and submit. The screen says plainly that applying does not
   reserve the place.
10. **See the application status.** Under Account → My applications, the
    application shows "Submitted" (or whatever the owner has since decided).
    Come back after the owner acts (next section) and the same screen shows
    the real outcome — approved with a hold deadline, or rejected with the
    owner's reason.

> **Why "Pay" doesn't open a bank app or card form:** ADR-0008 deliberately
> deferred choosing a real payment provider — commercial terms for one
> haven't been agreed. The sandbox gateway is not a no-op stand-in, though:
> it signs and verifies callbacks exactly like a real provider would, so
> everything after the tap — verification, idempotency, the ledger entry — is
> the real code path a real provider will run through once one is chosen.

## Owner — in the owner-web dashboard

1. **Sign in.** Open the owner-web app and sign in with the owner account.
2. **See the application.** Go to Applications — the one the customer just
   submitted is there, with their move-in date, occupant note, and attached
   documents. Approve or reject it with a reason; the customer's app updates
   accordingly (see customer step 10).
3. **See the real money signal.** Open the Dashboard. "Collected this month,"
   "Still owed to you," the claimed-vs-received chart, and the recent
   payments table are all read from the live `/organizations/:id/collection`
   endpoint — not sample data.
4. **Verify the transaction lands in the collection view.** The nightly
   booking's payment does **not** appear on this dashboard — nightly stays
   are prepaid in full and raise no invoice, so there is nothing to collect
   on (see `docs/07-integrations/payments.md`, "Collection/invoice
   separation"). What *does* appear here, once a monthly tenancy exists and
   an invoice is issued against it, is that invoice and any payment applied
   to it — go to Payments to see the full claimed/received breakdown and
   who's overdue.

---

## What this script deliberately does not cover

- Sprint 6.4's timed performance gate (separate, device-specific).
- Push notifications, real messaging, refunds, offline cash recording, and
  every other explicitly deferred surface in
  [mvp-roadmap.md](mvp-roadmap.md#out-of-the-mvp-cut-line).
