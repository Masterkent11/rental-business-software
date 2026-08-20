# Authentication

> **Status:** Written
> **Owner step:** Step 3 — Architecture
> **Last updated:** 2026-08-20
> **Depends on:** [entities.md](../03-domain/entities.md), [multi-tenancy.md](multi-tenancy.md)
> **Informs:** [08-security](../08-security/), [06-frontend](../06-frontend/)

Who the person is. What they may do is [authorization.md](authorization.md).

---

## One account, for life

D-15 is an authentication requirement before it is anything else: **Customer → Tenant adds capabilities to the same account.** Ana signs a lease and keeps browsing, without logging in again, without a second account, without anything being re-keyed.

So identity is platform-scoped and Organization-independent. A User belongs to no Organization ([entities.md](../03-domain/entities.md#user)).

---

## Supabase Auth, for identity only

| Supabase Auth owns | The platform owns |
|---|---|
| Credentials and password hashing | Capabilities |
| Email and phone verification | Organization membership |
| Session issue and refresh | Staff assignments |
| Token signing | Every authorization decision |

Sign-in methods for V1: **email + password**, and **mobile number + OTP** — the second because a phone number is the identifier most Philippine tenants actually have and remember.

Passwords never reach the API service. It receives a token and verifies it.

---

## Capabilities are never read from the token

**This is the most important rule on the page.**

```
   WRONG                              RIGHT

   JWT {                              JWT { sub: user-id }
     capabilities: [TENANT, ...]              │
   }                                          ▼
        │                            API loads capabilities
        ▼                            from the database,
   API trusts the claim              per request
```

A token is a snapshot. Capabilities change underneath it constantly and consequentially: a lease closes and `TENANT` lapses; a guest checks out and `GUEST` lapses; a staff member is dismissed; an Organization is suspended.

A dismissed staff member holding a valid hour-old token with `STAFF` in it can still record cash payments. That is not a theoretical risk — it is the trust surface D-09 exists to protect ([product-scope.md](../00-overview/product-scope.md#risk-4--the-offline-payment-path-is-a-trust-surface)).

**Cost, stated:** a capability lookup on every authenticated request. It is one indexed query, cached per request, and it is the price of revocation working the moment it is meant to.

---

## Session shape

| | |
|---|---|
| Access token | Short-lived JWT, verified by the API on every request |
| Refresh token | Long-lived, held by the client's Supabase SDK |
| Mobile | Refresh token in the OS keychain / keystore. Never in shared preferences |
| Web | httpOnly, `Secure`, `SameSite=Lax` cookies via the Supabase SSR client |
| Revocation | Sign-out revokes the refresh token; capability changes take effect on the next request without waiting for expiry |

The API verifies the token signature and expiry, and nothing else about it. Everything else it needs, it looks up.

---

## Organization context on a request

A user may act within several Organizations — tenant of one, staff at another. The Organization is therefore **part of the request**, not part of the identity:

```
   Authorization: Bearer <token>          → who
   X-Organization-Id: <uuid>              → acting within
```

The API verifies membership before the header is honoured. An unrecognised or unauthorised Organization is a `403`, never a silent fallback to a default — a silent fallback is how someone reads the right screen with the wrong scope.

Surfaces that are single-Organization by nature (the tenant web app, the customer app) send it implicitly from the resource being viewed. Owner and admin surfaces let the user switch, explicitly and visibly.

---

## What V1 does not do

| Not built | Why |
|---|---|
| Social sign-in | Adds account-linking complexity before there is evidence anyone wants it |
| Multi-factor authentication for tenants | Deferred. Considered for Platform Admin before pilot exit |
| Magic links | OTP already covers the phone-first case |
| Device management, session listing | Post-pilot |
| SSO for Organizations | D-26 territory — no agency hierarchies in V1 |

Platform Admin, Support, and Finance accounts are **provisioned manually** and never self-register. There is no public path to a privileged account, which removes an entire class of attack from the pilot.
