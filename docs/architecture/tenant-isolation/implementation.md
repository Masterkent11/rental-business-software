# Remaining tenant implementation

User authorized local remaining phases on 2026 11 01 after reviewing the earlier bounded Agent continuation. Existing issues 32 and 64 were extended before code. No production, remote DDL, push, merge or deployment authorization is inferred.

## Local implementation decisions

Use an invoker secured tenant and membership projection over existing organization membership and Agent profile/capability records. OWNER identity remains organization ID and AGENT identity remains Agent profile ID, with kind forming the common identity. This avoids a duplicate writable membership ledger and requires no risky ownership backfill. Existing explicitly granted dual memberships remain valid. New first partner enrollment is serialized and cannot automatically add the opposite partner role; private draft onboarding is allowed, regulated operations retain verification gates.

Sidebar workspace identity is static. Account remains the explicit server revalidated selector for genuine authorized memberships. The UI cannot grant a second partner role.

Database helpers must enforce active identity, membership/capability, organization and Agent lifecycle and current resource grant intervals. Private child links must match their parent organization. Browser Realtime subscriptions use the same database eligibility and ignore callbacks after disposal. API startup must reject a privileged or table owning database role.

The administration foundation has separate scoped permissions, verified token MFA assurance and an append only privileged audit journal. Monitoring exposes counts only. Existing verification operations must adopt the same permission gate. No impersonation or financial/customer detail endpoint is added. The future admin UI remains a separately scoped product.

## Sequence and verification

1. Correct static workspace identity and handshake paths.
2. Implement canonical tenant projection, serialized provisioning and database lifecycle/resource boundaries.
3. Wire application identity, least privilege startup and admin policy/audit.
4. Test synthetic Owner A/B and Agent A/B, opposite role enrollment, suspended/revoked actors, expired grants, forged child ownership and admin denial/audit.
5. Rehearse migration and rollback in a disposable local PostgreSQL cluster. Capture schema/ACL and no ownership drift evidence.
6. Verify API and frontend typecheck/lint/tests, production build and browser UI regressions. Record actual results and external rollout gates.

Remote application, hosted Realtime/provider verification, production restore and release monitoring need separate authorization and environment access. No test marked skipped or not run is a pass.

## Delivered local behavior

Sidebar workspace identity has no button, dropdown or switch arrows. The obsolete Account Agent self enrollment card was removed. The existing Account workspace list is the explicit selection surface for independently eligible contexts, with backend refresh before state commit. The handshake thumb was hidden beneath the receiving palm in the previous SVG; its layer order is now corrected without raster embedding.

Partner authority is projected in app_private.partner_tenants and partner_memberships with security_invoker. The existing organization ID or Agent profile ID remains the tenant boundary; kind disambiguates them. No parallel writable tenant directory, invented tenant ownership or bulk ID rewrite was introduced. New first partner enrollment shares a user advisory lock across both repositories. Database triggers additionally deny forged foreign memberships, self granted platform/staff authority, changed membership facts and reactivation of revoked authority. Maintenance provisioning is explicit and bypasses no public API guard.

Unreviewed historical Owner plus Agent profiles are excluded from Agent eligibility. Existing separately authorized verified dual memberships are preserved. A first time Agent without Owner membership retains private onboarding access before verification. Current resource collaboration, media writes and resource dependent data require verification, live capability, nonsuspended identity/organization, current accepted representation and the existing action permission.

Database helper changes cover Agent identity, Owner membership, representation intervals, commercial data, customer entitlement, Storage write checks, authenticated message/inquiry/viewing policies, referral lookup and assignment candidates. Composite constraints protect listing children and resource parent/root ownership. Inactive actor restrictions apply to private application tables. Internal service contexts remain trusted server scopes; arbitrary application-role SQL/GUC changes are not a browser API. API startup rejects superuser/BYPASSRLS or inherited application table ownership and refuses enabling tenant contexts before the required migrations exist.

The separate admin control plane now has GET /admin/partners/summary with counts by partner kind/state only. It requires PLATFORM_ADMIN, a signed top level aal2 claim, PARTNER_MONITOR permission, purpose and server request correlation. AGENT_REVIEW and IDENTITY_REVIEW are separate permissions; the existing verification and evidence use cases use the same gate. user_metadata cannot supply MFA authority. Administrative authorization decisions are journaled, verification mutations add a transactionally recorded MUTATION event, and the application role cannot read, rewrite or delete the journal or provision its own permissions. No admin account, credential, wildcard partner context, impersonation operation or future admin UI was created.

## Migration and rollout artifacts

- supabase/migrations/20261101034546_partner_tenant_boundaries.sql
- supabase/migrations/20261101034547_platform_administration_permissions.sql
- supabase/tests/partner-tenant-preflight.sql, read only counts and mismatch checks
- scripts/tenancy/verify-local.sh, disposable local migration and baseline restore rehearsal

TENANT_BOUNDARIES_ENABLED defaults to false in the example configuration. New app enrollment and eligibility checks and static sidebar are active application changes; the common projection path is enabled only after both migrations are applied and reviewed. Setting the flag before schema availability fails startup rather than widening access. Do not turn the flag on in the configured project until the authorized migration step is complete.

Before any remote execution, an authorized operator must run the read only preflight with sufficient visibility and review all counts, mismatches and uncertain legacy membership facts. Every mismatch must be resolved deliberately; do not drop a constraint or reassign rows to make a migration pass. Confirm locks, runtime and backup/restore against the target workload. Local fixture counts cannot predict production duration or prove production rows are consistent.

For admin provisioning, a separately authorized maintenance operator must grant the exact permission to an existing internal administrator with MFA enrolled, an explicit expiry and review record. No permission rows are automatically backfilled for legacy PLATFORM_ADMIN capabilities. Default is no monitoring or review permission. Define audit retention and privileged support policy before release; there is no silent deletion job.

On rollout anomaly, freeze new writes and disable the projection cutover flag while retaining the database denial controls. Do not restore permissive helpers or remove isolation constraints as an automatic rollback. The local baseline restore demonstrates backup integrity only. A production rollback requires a separately approved consistent policy/code backup, write reconciliation and incident plan.

## Executed acceptance and external gates

The final local database run passed 68 tests in seven suites. It included real Nest/Fastify HTTP requests through existing controllers for missing bearer, Owner to Agent denial, Agent to Owner denial, Owner A to B denial, forged Agent ID query scoping, revoked Agent denial and admin MFA/permission denial. It also exercised actual PostgreSQL RLS, authenticated-role message reads before/after grant expiry, private Storage authorization helpers, concurrent enrollment, forged authority rejection, canonical membership visibility, legacy review handling, and administrative journal protections.

The rehearsal applied the two migrations transactionally over a seeded baseline including a synthetic verified legacy dual membership. Seven owner relationship mismatch checks were zero locally. Counts [organizations, Agent profiles, memberships, listings] remained [4, 1, 1, 7] across migration and baseline backup restore. These are synthetic local counts, not the configured Supabase project's counts. The runner destroys only its marked disposable local cluster.

Frontend production build, typecheck and lint passed; all 85 frontend tests passed. API typecheck, lint and build passed. Agent responsive browser fixtures passed at 375x812, 834x1112, 1440x900, 1672x941 and 1920x1080, including static sidebar identity and explicit Account switching. Owner dashboard and Marketing browser regressions passed. Browser provider/Auth/API requests were intercepted synthetic fixtures. The actual existing local API returned health 200 and unauthenticated Agent/admin requests 401. Evidence and exact suite counts are in evidence/implementation/verification.json.

Not run or authorized: configured Supabase migration/preflight application, hosted Realtime transport or Storage provider revocation, real admin MFA enrollment, production restore, release monitoring, push, merge or deployment. Issued signed URLs still have their documented bearer TTL; new issuance is guarded. The future Super Admin UI is not part of the local security foundation. No complete production tenant isolation certification is claimed.

Design references consulted: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization), [MFA assurance](https://supabase.com/docs/guides/auth/auth-mfa). Product evidence is the code and executed tests, not documentation alone.

Final API unit run: 437 passed, 242 DB dependent tests skipped. The separate disposable database run passed 68, with zero skipped. The membership fixture for the existing identity test now uses explicit maintenance provisioning; the application role cannot mint STAFF capability for fixture convenience. Local guards also reject self verification of organizations and self reactivation of deactivated identities.

## Full suite follow up on November 2, 2026

The complete disposable database run now records 651 passing and 44 failing tests. The partner organization lifecycle policy rejects customer application writes and payment notification delivery; rental policy downstream assertions also fail. Targeted tenancy, branding, onboarding, marketing and Agent security coverage still passes (42 tests), and the targeted backup/restore rehearsal passes. Earlier bounded verification must not be interpreted as complete customer regression acceptance. See [current verification](../../agile/git-organization/verification.md). Release remains blocked on issue 32. No remote migration applied.
