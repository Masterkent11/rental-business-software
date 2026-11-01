# ADR: Partner tenant identity and platform administration

Status: ACCEPTED FOR LOCAL IMPLEMENTATION by the subsequent user request to implement remaining tenant phases. Remote migration and rollout remain gated. Recorded 2026 11 01. This supersedes no existing accepted ADR until reviewed.

## Context and current implementation

Supabase authenticates a platform user; NestJS verifies the JWT with JWKS, then loads current capabilities and organization membership from PostgreSQL. Owner tenants already have durable `organizations.id` identifiers, `organization_members`, and organization scoped inventory, financial and messaging records. Agent private data is keyed to `agent_profiles.id` with a unique `user_id`, global AGENT capability and user scoped repositories. Agents do not currently have an independent partner tenant/membership lifecycle equivalent to Owner organizations.

The configured database connection was inspected using a READ ONLY transaction: `rental_app`, not superuser, not BYPASSRLS, no application tables owned by that role. Privileged Supabase Storage operations separately use server credentials. RLS alone cannot authorize those operations. Most repositories use transaction local `app.user_id` and/or `app.organization_id`; these are trusted server context, never browser authority. The API's local database fallback uses `postgres`, so deployment must refuse privileged or missing connection configuration after approval.

A mixed workspace selector is not evidence that Owner A can read Owner B. It is currently built from `/me` memberships and the same user's Agent profile. However, self enrollment, revocation, expiry and cache gaps require remediation before strict isolation can be accepted. See [audit](tenant-isolation/audit.md).

## Decision proposed for approval

1. Separate User identity, Partner Tenant, explicit Membership, Resource Ownership, action Policy and Platform Administration.
2. Preserve existing Owner organization IDs and Agent profile IDs. Introduce an additive partner tenant registry only to supply the missing common tenant identity/lifecycle; do not build another organization or Agent account system. Map an OWNER registry entry to exactly one existing organization and an AGENT entry to exactly one existing Agent profile. A person can hold separately authorized memberships; no inferred second role and no removal of legitimate legacy memberships without review.
3. Membership is server provisioned with invited, active, suspended, revoked and verification facts. A partner tenant has its own operational status. Registration creates only the explicitly chosen, approved onboarding context; regulated operations remain verification gated. Product approval must specify whether draft/private dashboard access is allowed while partner verification is pending.
4. A requested tenant or organization is a selection hint. Each request independently resolves a live, eligible membership and tenant state. No client role, cookie, URL, dropdown, or local storage can create membership. Revalidate switch eligibility server side before committing browser context. Stale or revoked membership fails closed.
5. Retain organization ownership of Owner resources. Retain Agent ownership of private clients/pipeline/tasks/drafts. Shared customer identities stay platform scoped with field limited views through bookings, applications, conversations or assignments. Do not copy global identities into each tenant or add tenant IDs blindly to public catalog content.
6. Reuse `listing_representations`, `lead_assignments` and existing permission bits for collaboration. Require active state, current validity interval, eligible Agent and explicit action permissions. Granting property access does not grant Owner dashboard, financial, application identity or social account access. Revoke prevents subsequent authorization immediately. Issued signed URLs remain usable up to their documented TTL unless a stronger delivery proxy is approved.
7. Keep platform admin identity and permissions separate from partner membership and tenant switching. Reuse and harden existing `PLATFORM_ADMIN` capability and `/admin/agents` endpoints rather than creating a competing admin flag. Add least privilege permissions, MFA/step up, purpose bound sensitive access and durable audit before future monitoring features. Aggregate monitoring is the default; no unrestricted impersonation or wildcard tenant.
8. A single policy vocabulary governs tenant actions, resource grants, signed URL issuance, realtime eligibility, jobs and exports. Application use cases invoke policies; controllers validate transport and call use cases; ports isolate persistence, identity and audit adapters. Deny by default and sanitize failures.

## Proposed mapping and constraints, not executable schema

| Concept | Existing canonical source | Additive proposal |
| --- | --- | --- |
| User | user_profiles and Supabase subject | Preserve ID, fail closed for deactivated profile |
| Owner tenant | organizations | Registry link, unique organization mapping, lifecycle aligned with organization verification |
| Agent tenant | agent_profiles | Registry link, unique profile mapping, independent membership lifecycle |
| Membership | organization_members, user_capabilities | Common eligibility view/port and additive tenant memberships only where needed; avoid permanently divergent truth |
| Collaboration | listing_representations, lead_assignments | Harden dates/revocation/permissions, retain resource ownership |
| Admin permission | PLATFORM_ADMIN capability | Explicit narrow grants, MFA assurance requirement and audit sink |
| Audit | No common privileged action journal verified | Append only events with actor/context/target/action/purpose/outcome/request/time and redacted safe metadata |

Registry references must have tenant kind checks and tenant safe uniqueness. Private relationship tables need same tenant composite FKs or verified relational ownership constraints. Index membership lookup by user, tenant and active lifecycle; resource ownership by tenant and ID. Do not add indexes until actual query plans and cardinality justify the exact form. Separate migration SQL and tests require approval.

## Actor context and policy contract

Proposed immutable `ActorContext`: authenticated user ID, selected partner tenant ID/kind, server membership ID/state/verification, actual action permissions, request ID and assurance facts. Do not send credentials or admin wildcard scope to the client.

`ResolveAllowedWorkspaces` returns only eligible memberships and safe display metadata. `SwitchActiveWorkspace` validates a requested membership and returns the resolved context; no privileged action trusts a remembered switch token without revalidation. Stateless request context is preferred; add a server session context record only if an approved revocation/assurance requirement needs it. Do not duplicate Supabase sessions.

For every private operation: verify identity, reject deactivated user, resolve eligible membership/tenant, authorize action and resource owner/grant, execute scoped repository, and record redacted privileged/security outcome. Public catalog and customer entitlement flows use separately explicit policies.

## Consequences and gates

This preserves existing business features and stable IDs, but requires backfill reconciliation, selective constraints/RLS, revocation tests, migration rehearsal, admin privacy review and staged cutover. It does not certify a universal tenant table as a security fix.

Approval decisions: confirm resource ownership mapping; private onboarding access while verification is pending; reuse of existing representation workflow with exact permission boundaries; treatment of legitimate multi membership accounts; admin monitoring only scope and sensitive support policy; audit retention; staged migration and rollback plan. See [migration plan](tenant-isolation/migration-plan.md) and [matrix](tenant-isolation/permission-matrix.md).

## Local implementation amendment

The common registry is implemented as invoker secured app_private.partner_tenants and partner_memberships projections over existing authoritative sources, rather than a second writable tenant/membership ledger. Tenant identity is kind plus existing organization/profile UUID. Future Agent teams can extend explicit memberships through a separately reviewed design. No ownership IDs were backfilled or replaced.

New self enrollment permits only the first partner role, serialized with a shared user advisory lock. An additional role requires explicit platform provisioning. A historical Owner membership plus unreviewed Agent profile is excluded from Agent eligibility; a separately reviewed verified legacy Agent membership is preserved. Draft private access remains available for first time unverified Agents, while representation dependent work requires verification, current grants and permissions.

The sidebar is a static current identity; Account contains only server resolved authorized contexts. Admin counts, Agent verification and identity evidence review require their individual scoped permission, a signed aal2 assurance claim and recorded administrative purpose/request correlation. Administration has no implicit partner context or impersonation capability. [Implementation evidence and limits](tenant-isolation/implementation.md).
