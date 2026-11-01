# Partner tenant isolation audit

Recorded 2026 11 01, Asia/Manila. Scope: repository, configured database metadata, synthetic source fixtures, existing unit tests and isolated browser API fixtures. Status: DOCUMENTED, approval required before security implementation or schema changes. No production account or private tenant record was queried to demonstrate an exploit.

## A. Actual findings

The screenshot raises a valid concern but does not prove Owner A can access Owner B or Agent B. Existing organization routes validate membership; Agent repositories normally derive their scope from the authenticated principal. Stronger lifecycle and context rules are still required.

| ID / triage | Finding and actual evidence | Classification |
| --- | --- | --- |
| TI 01 / P0 | Baseline `use-agent-store.ts` has no reset/subscription fence. A pending Agent A dashboard response populated the store after logout and Agent B login in a deterministic HEAD-source reproduction. Shell cleanup resets other stores but not this baseline Agent store. | Confirmed client state isolation defect, synthetic source reproduction; not a live server cross tenant query |
| TI 02 / P0 | Baseline Agent dashboard checks profile existence, not actual AGENT capability or suspension. The own suspended profile with no AGENT capability still resolves in a synthetic application fixture. `listAgentClients` and task operations also rely on user scope without a common active Agent lifecycle gate. Current DB `current_app_agent`/`current_auth_agent` helpers resolve profile existence without suspension. | Confirmed lifecycle policy gap; access remains keyed to own identity in reviewed paths |
| TI 03 / P0 | `partnerListingGate` and `assertActiveRepresentationAllows` check state/permission but not validFrom/validUntil. An ACTIVE expired representation passed the real shared gate with a synthetic fixture. The repository and DB helper definitions reviewed likewise lack interval checks. Marketing's local access rule has its own interval check, showing policy drift. | Confirmed expired grant authorization gap at shared application gate; no real mutation attempted |
| TI 04 / P0 | `resolvePrincipal` retries profile creation then returns a principal even when an inactive profile remains unavailable. `loadPrincipal` filters inactive profile but loads capabilities/member separately; `createProfile` conflict update does not reactivate it. The resolver returned the still-capable principal in a synthetic fixture. | Confirmed fail closed lifecycle gap; live deactivated account behavior not exercised |
| TI 05 / P0 | `POST /agent/profile` calls `registerAgentProfile`, then repository create inserts the AGENT capability for that same identity. It does not require separately approved partner membership or reject existing Owner role. New Owner onboarding checks authentication/name, not approved cross-role enrollment. Account UI offers Agent setup. | Confirmed implementation conflicts with newly specified initial provisioning policy; does not grant another person's data |
| TI 06 / P0 | Owner membership resolver filters revoked_at but does not check organization SUSPENDED status; `organizationsFor` returns membership and a boolean verified flag. Workspace construction accepts Agent profile regardless of capability revocation/suspension. No common tenant membership verification lifecycle exists across both portal kinds. | Source confirmed lifecycle/model gap; pending verification access requires product decision |
| TI 07 / P1 | `PLATFORM_ADMIN` and `/admin/agents` already exist with server capability enforcement. No MFA/step up check, narrow admin permission vocabulary, purpose bound support scope or shared append only privileged action journal was verified in these paths. Verification actor fields are not a complete audit log. | Existing partial admin foundation; proposed control plane requirements missing, not evidence of partner admin access |
| TI 08 / P1 | Owner organization is an actual tenant; Agent private scope is a unique user/profile. There is no common independent Agent tenant/membership model in the configured catalog. Customers and public catalog entities deliberately have different visibility. | Architecture gap versus approved business direction; not proof current Agent A/B data are globally shared |
| TI 09 / P0 acceptance | Database pool has a `postgres` fallback if DATABASE_URL is missing. Configured connection is rental_app without superuser/BYPASSRLS/table ownership. Storage uses separate privileged service credentials; security definer helpers and GUC context remain trusted server boundaries. | Configuration risk and mandatory privileged-path review; actual configured SQL role is least privileged on checked attributes |
| TI 10 / P1 | Shell route guard and workspace selection are client navigation. `/me` is server sourced, but switching stores a local preference and does not await an eligibility endpoint. No browser auth-state listener was found to synchronously invalidate UI after cross-tab sign-out/revocation. Existing request resets cover many stores, not a complete account/membership lifecycle contract. | Confirmed design limitation; backend membership checks remain the authority |
| TI 11 / P0 acceptance | `tenant-isolation.test.mjs` defines a toy use case/repository inside the test and does not invoke real product authorization. Other store tests are meaningful, but no complete live API/DB/storage/realtime/admin denial matrix was run in this audit. | Test coverage gap; 77 passing tests are not isolation certification |
| TI 12 / P1 | Workspace native select, Agent shell typography/icons and absence of illustrated metrics differ from the supplied visual target. New local artwork/layout draft is incomplete and not visually accepted. Exact source packs exist in Downloads, including 48 path based SVGs in the Navy Final pack; the other pack has raster wrappers among its SVGs. | UI/asset discrepancy, not authorization proof; approved asset selection and visual QA remain |

Each P0 item blocks release acceptance for the affected scope. Triage priorities are not CVSS ratings. Reproduction assertions in [results](evidence/reproduction-results.json) pass when the unsafe behavior is observed; they must not be read as security PASS.

### Existing controls confirmed

- JWKS verification checks signature, issuer, audience and expiry. Metadata supplies a display name, not authorization.
- `resolvePrincipal` rejects an organization when database membership is false, regardless of a scoped capability in the synthetic test. Owner action rules compare the requested organization to the capability scope.
- `/agent/dashboard` has no target Agent user parameter; reviewed Agent reads use principal.userId. Accepted representation, specific permission bits and assignment rules already exist and must be hardened/reused rather than rebuilt.
- `workspacesFor` only maps supplied memberships/profile. Foreign remembered organization keys cannot create a workspace. Browser Owner-only and Agent-only direct route tests redirect to their own portal.
- Configured SQL role is `rental_app`, rolsuper false, rolbypassrls false; it owns none of the 46 inspected application tables. 45 have RLS. The remaining internal provider_events table denies anon/authenticated SELECT and authenticated INSERT. No public anon table reads are granted; authenticated reads are limited to conversations, inquiries, messages, notifications and viewings and still require policy review.
- Private application documents use server issued read URLs with 120 second TTL and scoped applicant lookup/path validation. Listing/tour public media is a separate intentional product surface; it is not a private document bucket.

Metadata snapshots: [table/policy/role inventory](evidence/configured-database-metadata.json), [effective ACLs and helper definitions](evidence/configured-database-access.json). `information_schema.role_table_grants` is visibility limited; the effective has_table_privilege results in the second snapshot are used for browser-role access conclusions.

## B. Architecture and proposed ADR

See [ADR](../adr-tenant-isolation.md) and [threat model](threat-model.md). Reuse Owner organizations, Agent profiles, membership/capability facts and resource representations. Introduce a stable common partner boundary only through a reviewed additive mapping; do not replace the modular monolith or create a second authentication/Agent system. Platform admin remains separate from the partner switcher.

## C. Permission matrix and ownership

See [matrix](permission-matrix.md). Own active authorized context allows only policy-defined actions; other Owner/Agent private contexts deny by default. Collaboration is resource/action scoped, current and revocable. Public catalog fields and customer entitlements remain explicit exceptions. Residential TENANT capability is distinct from partner tenancy.

## D. Affected files, endpoints and schema risks

| Area | Exact source paths / endpoints |
| --- | --- |
| Identity/membership | apps/api/src/application/identity/resolve-principal/resolve-principal.use-case.ts; infrastructure/postgres/repositories/postgres-user.repository.ts; infrastructure/supabase/jwks-identity.provider.ts |
| Partner policy | apps/api/src/application/identity/partner-access.rules.ts; application-authorization.rules.ts; domain/agents/representation.ts; infrastructure/postgres/repositories/postgres-representation.repository.ts |
| Agent lifecycle/dashboard | apps/api/src/application/agents/agent-dashboard/agent-dashboard.use-case.ts; manage-agent-profile/manage-agent-profile.use-case.ts; manage-agent-tasks/manage-agent-tasks.use-case.ts; list-agent-clients/list-agent-clients.use-case.ts; modules/agents/controllers/agent-workspace.controller.ts |
| Admin | apps/api/src/modules/agents/controllers/admin-agents.controller.ts; application/agents/review-agent-verification/review-agent-verification.use-case.ts; infrastructure/postgres/repositories/postgres-agent.repository.ts |
| Transaction scope/storage | apps/api/src/infrastructure/postgres/db.ts; infrastructure/storage/supabase-document-storage.adapter.ts; supabase-verification-evidence.adapter.ts; supabase-media-storage.adapter.ts; supabase-listing-media.adapter.ts |
| Frontend context | apps/owner-web/domain/workspace/workspace.ts; infrastructure/auth/supabase-session.adapter.ts; stores/use-session-store.ts; use-agent-store.ts; use-dashboard-store.ts; infrastructure/realtime/supabase-realtime.adapter.ts |
| Frontend shell/UI | apps/owner-web/components/owner/shell.tsx; dashboard-icon.tsx; dashboard-metric.tsx; app/(owner)/page.tsx; app/(owner)/agent/page.tsx; new incomplete components/agent/dashboard-view.tsx and dashboard.css; components/owner/dashboard-header.tsx |
| HTTP surfaces | GET /me; POST /me/owner-workspace local draft; /organizations/:organizationId/listings/properties/resources and related Owner applications/payment/conversation APIs; /agent/profile/dashboard/clients/tasks/representations/analytics; /agent/listings/:id; /admin/agents/pending and /admin/agents/:id/verification; local /agent/marketing foundation |
| Tables | See ownership matrix and configured metadata. Existing public table names are preserved; new registry/membership/audit objects are proposals only. |

[HTTP inventory](evidence/http-route-inventory.json) covers 40 controller files statically. This is route discovery, not an authorization test of every endpoint. [Migration plan](migration-plan.md) defines additive mapping, ambiguity quarantine, constraint/policy rollout, rehearsal and rollback. No SQL migration was authored or applied for this task.

## E. Backlog reconciliation

[Reconciliation](../../agile/tenant-isolation/README.md), [12 detailed drafts](../../agile/tenant-isolation/reconciliation.json), [live board snapshot](../../agile/tenant-isolation/board-snapshot.json).

Verified board: [GitHub Project 3](https://github.com/users/Masterkent11/projects/3), title Westayplace: Product & Engineering Delivery, 128 items/issues inspected. Existing [security Epic 14](https://github.com/Masterkent11/rental-business-software/issues/14) and [isolation Story 32](https://github.com/Masterkent11/rental-business-software/issues/32) overlap the proposed tenancy Epic; reuse the umbrella pending cross tracker review. Keep [auth 103](https://github.com/Masterkent11/rental-business-software/issues/103), [representation 56](https://github.com/Masterkent11/rental-business-software/issues/56), [dashboard 64](https://github.com/Masterkent11/rental-business-software/issues/64) and [role intent 113](https://github.com/Masterkent11/rental-business-software/issues/113) distinct.

Atlassian plugin discovery found an available uninstalled integration; no connected Jira tools or verified WSP server IDs. Prior repository governance names GitHub Project 3 as the verified board. New records are NOT PUBLISHED to avoid duplicate cross tracker Epics/stories. No Jira keys, parent relationships, dates, assignees or estimates are fabricated. Existing native parents/states are recorded. The 12 proposed keys are planning identifiers only. Missing followups include ADR, model/membership mapping, lifecycle/expiry/cache regression, admin architecture and full denial/release acceptance; existing representation and UI scope are reused.

## F. Screenshot and UI discrepancies

The pasted governance kit refers to three named reference PNGs and AGENT_MASTER_PROMPT.md, but that ZIP/file and exact three reference filenames were not present in the attached local paths searched. Both equivalent full master prompt pastes and both equivalent backlog pastes were read and deduplicated. The provided Agent target and highlighted Owner/workspace screenshot were inspected as two available images; the missing distinct kit dropdown image is not claimed reviewed. Input provenance is in [inputs](evidence/inputs.json).

Owner target uses the existing city/living room banner, navy text, light blue active navigation and gray/blue dimensional artwork. Agent target has five distinct KPI illustrations plus no activities, inquiry and response imagery, Agent-specific metrics and Marketing/Workspace categories. Native select chrome can overlap on an OS menu; implement an accessible anchored selector only after real eligibility/context is correct. No unauthorized role option may be inferred from a remembered preference.

Read-only inventory found three Agent asset ZIPs already in Downloads. Navy Final contains 48 SVGs with no image/data:image wrapper; the 1to1 pack contains 51 SVGs, two with embedded raster. No asset from them was installed in this audit and no one-to-one SVG or visual acceptance is claimed. The previous hand recreated local artwork should be reviewed against those sources, not treated as final approved assets.

## G. Test results and limits

| Check / command | Result | Boundary |
| --- | --- | --- |
| apps/owner-web: npm test | PASS, 77 tests, zero skipped | Existing unit/architecture suite; toy tenant mock tests do not certify product isolation |
| apps/api: npm test -- src/application/identity/resolve-principal/__tests__/resolve-principal.test.ts src/domain/agents/__tests__/agent.test.ts src/infrastructure/supabase/__tests__/jwks-identity.provider.test.ts src/__tests__/architecture.test.ts | PASS, 55 tests in four files | Existing pure tests, no configured DB mutation |
| node /tmp/wsp-tenancy-reproduce.cjs, source retained in evidence/reproduce.cjs | Seven assertions executed: four unsafe behaviors reproduced and three deny/navigation assertions passed | HEAD source for baseline Agent store/dashboard; current unchanged shared resolver/gate; synthetic ports only |
| Browser audit /tmp/wsp-tenancy-browser.mjs | PASS, three scenarios, zero page errors | Previously built preview localhost:3203, synthetic intercepted auth/API, not incomplete current draft or live authorization |
| GET /me, /agent/dashboard, /admin/agents/pending, /organizations/11111111-1111-4111-8111-111111111111/listings without bearer | PASS, all 401 | Actual local API, no authenticated live account created |
| Configured DB role/policy/ACL/function metadata | Read only queries completed | No application row reads, no DDL or mutations |
| apps/api: npm run typecheck | PASS | Current local tree including pre-gate dashboard guard draft |
| apps/owner-web: npm run typecheck | FAIL, three errors | Incomplete pre-gate draft: dashboard-view.tsx references absent AgentProfile.userId; two scoped Zustand setter overload incompatibilities in use-agent-store.ts |
| Full authenticated HTTP/DB Owner A/B and Agent A/B matrix | NOT RUN | Requires reviewed synthetic staging fixtures and approval; no production-account testing |
| Storage/realtime revocation, admin MFA/audit, migrations/restore, 200% zoom/screen reader, four current UI viewport captures, CI/release | NOT RUN | Explicit acceptance gates, not inferred from screenshots or old checks |

Logs and [browser records](evidence/browser/results.json) are attached. Browser captures show baseline Owner/Agent route denial and dual selector. Existing earlier marketing, auth or broad DB test reports are historical evidence only, not rerun or recertified by this audit. No new lint/build/security release acceptance is claimed.

## H. Changes already present and approval boundary

Branch: codex/agent-marketing-phase-one, no new commit/PR/push/merge/deploy. Prior authentication and Marketing Hub work remains uncommitted and untouched by this governance audit.

Before the new stop-for-approval instruction, the earlier dashboard implementation request authorized work and received an appendix in live issue #64. Local edits began in Agent dashboard view/CSS, shared shell/header, Agent store, Agent dashboard use case and five new SVGs. They remain incomplete and unaccepted; the frontend typecheck errors above are disclosed. The native select defect and full tenant model are not fixed. No schema change was made for that dashboard work.

After the approval gate, only audit/document/evidence files were written. Product code and migrations are preserved without further edits. No security fix is represented as approved. Existing draft changes need explicit review before they are corrected, validated or adopted. No automatic revert/discard was performed.

## I. Blockers, decisions and next step

1. Review and approve or amend the ADR, ownership map, provisioning/verification policy, representation permissions/expiry, legacy multiple memberships and monitoring-only admin scope.
2. Connect/confirm Jira WSP and the canonical GitHub mapping before publishing missing followups; do not clone existing 14/32/56/64 work. Drafts are reviewable now.
3. Approve a bounded first implementation: fail closed identity/Agent lifecycle, current representation interval, and account-scoped cache reset/context revalidation with real negative tests. Review the existing incomplete draft first; no additional schema execution is implied.
4. Separately approve exact additive SQL and rehearsal data once generated/reviewed. Migration execution, staging/production data mutations and release require their own permission.
5. Complete isolated/staging negative matrix, storage/realtime/admin assurance, current visual/accessibility checks and security review. No production readiness declaration until those gates pass.

Primary documentation consulted: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase changelog](https://supabase.com/changelog). Local skills applied: Supabase and Supabase Postgres best practices. Public docs are guidance; repository code, catalog metadata and executed checks are the finding evidence.

## J. Bounded Agent continuation after the audit

After the user requested continuation of the Agent implementation, existing issues 32 and 64 received the scope before resumed product edits. The original A to I findings and test results above remain a historical audit snapshot. See [implementation and executed evidence](../../agile/agent-dashboard/implementation.md) for the subsequently corrected Agent eligibility, inactive identity, current representation interval, session cache fencing, backend revalidated workspace switching and dashboard visuals. The full ADR, schema, provisioning, direct DB helper lifecycle/expiry, storage/realtime and Super Admin work is not certified complete. No remote migration or release was authorized or performed.

## K. Remaining local phases

The user subsequently authorized the remaining local implementation. [Current implementation and evidence](implementation.md) supersedes the earlier bounded implementation limit for local code and rehearsal only. It does not grant remote schema execution, release, production writes or approval of the future admin UI. Original audit findings and original test outcomes above remain historical.
