# 04 — API Contracts

> **Status:** Written (Sprint 1 scope only)
> **Owner step:** Step 5 — API Contracts, sliced per sprint
> **Last updated:** 2026-08-22
> **Depends on:** [03-domain](../03-domain/), [02-architecture](../02-architecture/)
> **Informs:** every client — Flutter customer app, tenant web, owner web

**This document covers only the endpoints that exist.** Each sprint adds its own, per the [MVP roadmap](../11-implementation/mvp-roadmap.md). A whole-API contract written now would be a guess about endpoints no story uses.

## Conventions

| | |
|---|---|
| Base URL | `http://localhost:8080` in development |
| Format | JSON. UTF-8 |
| **Money** | **Integer centavos**, always. `850000` is ₱8,500. A JSON number of pesos would reintroduce the float [P-06](../02-architecture/architecture-principles.md#p-06--money-is-integer-minor-units-end-to-end) exists to prevent |
| Currency | `"PHP"` on every amount-bearing response. D-02 means no conversion logic, but the field prevents an ambiguous integer |
| Dates | Occupancy dates are `YYYY-MM-DD` in `Asia/Manila`. Financial instants are RFC 3339 UTC — the distinction is deliberate ([occupancy-model.md](../03-domain/occupancy-model.md#dates-versus-instants)) |
| Errors | `application/problem+json`: `title`, `status`, optional `errors[]` |
| Absent vs forbidden | An unpublished listing is **404, never 403**. A 403 would confirm a draft the customer should not know exists (D-12) |

### Availability is server-decided, always

Responses carry `availabilityLabel` and `isAvailable` as **copy the server has already decided**, never dates for a client to interpret.

There is exactly one occupancy timeline per resource ([U-01](../03-domain/occupancy-model.md)), and it is server-side. A client that derived "Available now" from dates would be a second source of truth for the one thing the platform must never be wrong about. Clients render these fields; they never compute them.

---

## `GET /health`

```json
{ "status": "ok" }
```

## `GET /listings`

Public. No authentication — discovery is the top of the funnel, and gating it would gate the product.

Returns **published listings only**, across all organizations. The marketplace is deliberately cross-organization: a customer searching Cebu should see every verified owner.

### Query parameters

| Name | Type | Notes |
|---|---|---|
| `q` | string | Matches title, property name, barangay, or city |
| `kind` | `LONG_TERM` \| `SHORT_TERM` | A hybrid resource carries two listings; this selects between them |
| `type` | `UNIT` \| `ROOM` \| `BED_SPACE` \| `PARKING` \| `STORAGE` | |
| `maxPrice` | integer centavos | |
| `hasTour` | boolean | |
| `limit` | integer 150, default 20 | |
| `offset` | integer ≥ 0, default 0 | |

**No date or occupancy parameters, deliberately.** "Is this free on those nights" is a question about one resource's occupancy timeline, answered by the availability endpoint that arrives in Sprint 3 — not by filtering listings. Adding dates here would invite the client-side availability the domain model refuses.

### 200

```json
{
  "items": [
    {
      "id": "c1111111-0000-0000-0000-000000000001",
      "title": "One-bedroom corner unit with cross-ventilation",
      "description": "Second-floor corner unit...",
      "propertyName": "ABC Apartment",
      "areaLabel": "Brgy. Kamputhaw",
      "cityLabel": "Cebu City",
      "kind": "LONG_TERM",
      "resourceType": "UNIT",
      "priceCentavos": 850000,
      "currency": "PHP",
      "hasTour": true,
      "sceneCount": 5,
      "photos": ["https://..."],
      "availabilityLabel": "Available now",
      "isAvailable": true
    }
  ],
  "limit": 20,
  "offset": 0
}
```

### 400

Invalid query parameters. `errors[]` carries the field-level detail.

## `GET /listings/{id}`

Public. `id` is a UUID.

**200** — the same object shape as an item above.

**404** — not found, or not published. The two are indistinguishable on purpose.

---

## Not yet specified

Everything else. Identity (Sprint 2), availability and bookings (Sprint 3), payments (Sprint 4), applications and reservations (Sprint 5), tours (Sprint 6). Each arrives with its sprint, in this document.


---

## Sprint 2 — identity

All of these require `Authorization: Bearer <token>`. See
[08-security/authn.md](../08-security/authn.md) for how the token is verified
and why capabilities are never read from it.

### `GET /me`

```json
{
  "id": "…",
  "displayName": "ana@example.test",
  "capabilities": [{ "capability": "CUSTOMER", "organizationId": null }],
  "organizationId": null
}
```

`capabilities` is sent so the client can shape its navigation — **not** so it
can enforce anything. Every authorization decision is made server-side; a client
that hid a button would still be talking to an API that checks.

The first authenticated request for a Supabase user creates the platform profile
and its `CUSTOMER` capability.

### `GET /me/saved-listings` · `POST /me/saved-listings` · `DELETE /me/saved-listings/{id}`

```json
{ "listingIds": ["…"] }
```

All three return the full list, so a client never has to guess the result of its
own write. `POST` is idempotent — the heart is a toggle, not a counter.

### `GET /listings?ids=a,b,c`

Fetches a specific set in one request, capped at 50. What the saved screen uses:
a customer with a dozen favourites on mobile data should not pay twelve round
trips. Still published-only, so unsaving is not required for a delisted place to
disappear.

### Refusals

| Situation | Status |
|---|---|
| No token, bad signature, expired, `aud: anon` | `401` |
| Malformed `X-Organization-Id` or `listingId` | `400` |
| Not a member of that organization | `403` |


---

## Sprint 3 — availability and booking

### `GET /resources/{id}/availability?from=&to=`

Half-open `[from, to)`, both `YYYY-MM-DD`.

```json
{
  "resourceId": "…",
  "nights": [
    { "night": "2027-03-01", "status": "OPEN" },
    { "night": "2027-03-02", "status": "BOOKED" }
  ]
}
```

`status` is one of `OPEN`, `HELD`, `BOOKED`, `LEASED`, `BLOCKED`. Everything
except `OPEN` means the customer cannot have that night.

Keyed by **resource**, not listing: a hybrid unit has a monthly listing and a
nightly one over one timeline, and both must show the same blocked nights. The
listing responses carry `resourceId` for this.

A lease on an ancestor shows as `LEASED` on the resource below it — leasing the
room takes the bunk with it.

### `POST /bookings`

```json
{ "resourceId": "…", "startsOn": "2027-03-02", "endsOn": "2027-03-04" }
```

Returns a **hold**, not a booking:

```json
{
  "id": "…", "state": "HELD", "nights": 2,
  "startsOn": "2027-03-02", "endsOn": "2027-03-04",
  "expiresAt": "2026-08-22T02:46:20.000Z"
}
```

The nights come off the market for 60 minutes and go back automatically if
payment does not arrive. `expiresAt` is returned because the customer needs to
know how long they have rather than be surprised.

### Refusals

| Situation | Status |
|---|---|
| Those nights are taken | **409** |
| No published nightly listing for the resource | **404** |
| Zero-night stay, backwards range, bad date | **400** |
| Stay longer than 90 nights | **400** |
| Could not serialize — retry | **503** |

409 and 503 are different on purpose: one says choose other nights, the other
says try again. See [05-database/occupancy.md](../05-database/occupancy.md).


---

## Sprint 4 — money

### `POST /bookings` now requires a token

**401** without one. A booking nobody owns cannot be shown to the customer, and
at check-in nobody can say who is arriving.

### `POST /bookings/{id}/payment-intent`

```json
{
  "paymentId": "…", "amountCentavos": 135000, "nights": 3,
  "redirectUrl": "https://…"
}
```

Priced in the database from the listing and the held dates. The request carries
no amount — a client-supplied amount is a client deciding what to pay.

**404** when the hold has expired, was already paid, or never existed.

### `POST /webhooks/payments`

Requires an `X-Signature` header over the **raw body**. On success the hold
becomes `COMMITTED`, a stay is created, and a `BOOKING_PREPAID` ledger entry is
appended — all in one transaction.

```json
{ "applied": true, "stayId": "…" }
```

A replayed event returns `applied: false` with the same 200, so the provider
stops retrying.

| Situation | Status |
|---|---|
| Missing or bad signature | **401** |
| Amount disagrees with the recorded payment | **400** |
| No payment for that reference | **404** |

### `GET /me/stays`

```json
{
  "stays": [{
    "reference": "D7C5BBA7", "listingTitle": "…",
    "startsOn": "2027-11-01", "endsOn": "2027-11-04", "nights": 3,
    "paidCentavos": 135000, "paidAt": "…",
    "stateLabel": "Confirmed", "bucket": "ACTIVE"
  }]
}
```

`stateLabel` and `bucket` are the server's decision, not the client's.

See [07-integrations/payments.md](../07-integrations/payments.md).


---

## Sprint 5 — applications and reservations

### `POST /applications`

```json
{ "resourceId": "…", "desiredMoveIn": "2029-09-01",
  "desiredTermMonths": 12, "message": "…" }
```

**Places no hold.** Many people may apply for one place; approval is what takes
it off the market. Requires a token.

| Situation | Status |
|---|---|
| No published **long-term** listing for the resource | `400` |
| You already have a live application for that place | `400` |
| No token | `401` |

Re-applying after a decision is fine — the uniqueness rule covers only live
applications.

### `GET /me/applications` · `GET /me/applications/{id}`

```json
{ "id": "…", "reference": "ACA98E14", "state": "SUBMITTED",
  "listingTitle": "…", "monthlyRentCentavos": 850000,
  "moveInCostCentavos": 3400000, "desiredMoveIn": "2029-09-01",
  "decisionReason": null, "holdExpiresAt": null,
  "documentCount": 1, "documentNames": ["id.jpg"],
  "reservation": null }
```

The single-application form additionally returns each document with a **signed
read URL**, minted per request and valid for minutes — a screenshot of the
response is not a lasting key to somebody's ID.

### `POST /applications/{id}/documents`

Two steps. Called without `storagePath`, it returns an upload ticket:

```json
{ "upload": { "storagePath": "…", "uploadUrl": "…", "expiresInSeconds": 300 } }
```

The client PUTs the file to `uploadUrl`, then calls again **with**
`storagePath` to record it. The API never proxies the bytes: a large upload on
a slow connection should not occupy an API worker for its duration.

Refused: anything but JPEG, PNG, HEIC, or PDF; anything over 10 MB; and any
attachment to an application that has already been decided — that would change
the record the decision was made on.

### `POST /applications/{id}/withdraw`

Terminal. Forfeits a paid reservation fee.

### `POST /applications/{id}/reservation`

```json
{ "reservationId": "…", "occupancyId": "…",
  "feeCentavos": 200000, "state": "PENDING_PAYMENT" }
```

Places a `HELD` occupancy covering the **whole intended tenancy** — a
reservation that blocked a token day would not reserve anything — with a
60-minute window to pay. Paying extends it to seven days.

Pay it through the ordinary payment endpoints:
`POST /bookings/{occupancyId}/payment-intent`, then the webhook. A paid
reservation creates **no stay**: nobody is staying anywhere, and the owner has
not decided.

| Situation | Status |
|---|---|
| The owner offers no reservation on that listing | `400` |
| Already reserved | `400` |
| Application already decided | `400` |

### `GET /organizations/{id}/applications` · `POST …/{id}/decision`

Owner side. Requires `OWNER` or `STAFF` **at that organization** — membership
alone is not enough, and a customer gets `403`.

```json
{ "decision": "APPROVED" | "REJECTED" | "UNDER_REVIEW", "reason": "…" }
```

A rejection **must** carry a reason; the applicant reads it.

**Approval places the hold** — 72 hours, while the applicant pays the advance
and deposit. If the term overlaps an existing booking or lease the approval is
refused with **409** and the conflict named, rather than discovered when the
tenant arrives.

The reservation fee is settled in the same transaction as the decision:
credited on approval, refunded on rejection, forfeited on withdrawal.
