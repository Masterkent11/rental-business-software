# Tenant isolation threat model

Status: LOCAL IMPLEMENTATION VERIFIED after explicit user continuation; remote acceptance remains gated. Applies to Owner tenants, Agent tenants, customers with entitlements and separately provisioned platform administrators.

## Trust boundaries

Browser local storage/Zustand/routes and uploaded content are untrusted. Supabase establishes identity; NestJS resolves current authority from the database. PostgreSQL pool settings are set only in parameterized server transactions. Storage signing credentials and maintenance jobs are privileged server boundaries. Realtime is a separate authenticated channel whose Postgres policies must remain equivalent to API eligibility. External providers are outside the partner trust boundary.

## Assets and adversaries

Private client lists, leads, messages, booking and payment records, identity evidence, documents, private media, partner credentials, membership grants and admin audit records. Threat actors include a malicious authenticated partner, former/suspended member with a still valid token, shared-device user, compromised browser, unsafe internal worker and overprivileged support operator.

| Threat | Existing evidence | Required control and verification |
| --- | --- | --- |
| Forged organization or Agent identifier | Organization resolver checks current membership; Agent dashboard derives user ID from principal | Deny guessed path/header/body IDs at API and DB; no arbitrary target Agent argument |
| Role self enrollment | Agent registration creates profile and capability; Owner onboarding draft provisions another role | Approve explicit provisioning policy, no inferred second partner role; preserve legacy memberships with review |
| Revoked/suspended user with valid JWT | Capability/member rows filtered by revoked_at, but Agent profile helpers and some use cases do not uniformly check suspension; inactive profile resolver gap reproduced | Central eligible actor policy; fail closed lifecycle checks across API, signing, realtime and jobs |
| Expired collaboration | Shared listing gate checks ACTIVE/permission but not validity interval; expiry gap reproduced | Clock tested validity and revocation checks; same predicate at DB/storage/realtime boundaries |
| Shared-device stale state | Baseline Agent store accepts late A response after logout/B login | Synchronous scoped reset, epoch/request fence and account scoped cache keys; deterministic A/B/A tests |
| RLS bypass | Configured app role not bypass; Storage service credentials and security definer helpers privileged | Minimum grants, no browser secrets, audit all signing gates and helper exposure; deployment privileged-role fail closed |
| Signed link reuse after revocation | Document read TTL 120 seconds; upload TTL 300 seconds | Document unavoidable bearer link window, short TTL, immediate denial of new signatures; proxy/revocation mechanism only if approved |
| Realtime subscription after revoke | RLS participant policies and removeChannel exist; no live revoke test run | Renew eligibility, unsubscribe/reset on change, verify policy denies subsequent events with real synthetic accounts in staging |
| Cross tenant joins/counts/exports | Scope specific repositories exist; complete endpoint denial matrix not executed | Assert counts, pagination, nested IDs and bulk operations with Owner A/B and Agent A/B fixtures |
| Admin abuse or forged admin claims | PLATFORM_ADMIN checked server side for existing verification APIs | Narrow permission grants, MFA assurance, reason/support case, aggregate default, append only audit, least privilege detail access |
| Audit tampering/PII logging | No shared privileged action journal verified | Protect audit writes/reads, redact payloads, define retention and approved investigation access |
| Migration misassignment | Owner organization and Agent profile data use different ownership shapes | Stable mapping, quarantine ambiguity, reconcile counts and FK ownership, staged flag and rollback rehearsal |

A PASS assertion that demonstrates an unsafe behavior is a reproduced finding, not security acceptance. No production account impersonation, actual cross tenant data fetch or live exploit was attempted. Severity is engineering triage, not a formal CVSS score.

Current implemented controls and executed negative cases are in [implementation evidence](implementation.md). Historical baseline findings in this table are not a claim that the later fixes are absent. Hosted Realtime transport, provider session behavior and production restore remain separate verification gates.
