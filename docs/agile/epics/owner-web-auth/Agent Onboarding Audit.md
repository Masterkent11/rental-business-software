# Agent onboarding audit

Recorded on 2026 11 01, Asia/Manila. Scope: audit and tracking before further development, as requested by the user. Existing uncommitted implementation is preserved. No product code was changed in this audit, no remote data was written and no migration, commit, push or deployment was performed.

## Answer

Agent functionality already exists in both Owner Web and NestJS. The correct journey is Agent selection, account creation, Agent profile setup, GET/POST `/agent/profile`, refresh GET `/me`, select the returned Agent workspace, and navigate to `/agent`. It does not create an Owner organization. The profile starts HIDDEN and UNVERIFIED. Listing representation still requires the existing server authorization and verified/public Agent rules.

The supplied screenshots show the Owner journey: Workspace name, Create workspace, and POST `/me/owner-workspace`. Typing “kent agent” into a workspace name does not select the Agent role. The screenshots cannot establish what radio choice or saved state existed earlier, so the exact cause of this user's role state is not asserted.

A separate deterministic reproduction confirms that the current role persistence can divert an Agent journey to Owner. This is the bounded functionality gap to fix after this audit is reviewed; rebuilding the Agent platform is unnecessary.

## Existing capability inventory

| Capability | Source evidence | Verification limit |
| --- | --- | --- |
| Choose Agent and carry intent to signup | `components/auth/role-selection.tsx`, `components/auth/auth-forms.tsx` | Normal intercepted browser journey passes |
| Agent setup fields and submit | `components/auth/workspace-setup.tsx:33` and `:108` | Professional name, headline and area fields exist |
| Private profile onboarding adapter | `infrastructure/auth/supabase-partner-access.adapter.ts:143` | GET profile, create on 404, recover conflict by rereading; HIDDEN request asserted in browser fixture |
| Authenticated Agent profile APIs | `apps/api/src/modules/agents/controllers/agent-workspace.controller.ts` | GET/POST/PUT profile and verification request exist; unauthenticated GET returns 401 |
| Persist profile and capability atomically | `apps/api/src/infrastructure/postgres/repositories/postgres-agent.repository.ts:103` | Existing real PostgreSQL registration/authorization tests pass |
| Actual workspace resolution | GET `/me`, session adapter, `domain/workspace/workspace.ts:51` | Agent workspace comes from returned profile, not editable role metadata |
| Agent profile editing and verification request | `app/(owner)/agent/profile/page.tsx`, Agent controller and rules | License required, Agent cannot verify themselves; platform review exists |
| Agent dashboard and operations | `/agent`, `/agent/properties`, `/agent/leads`, `/agent/viewings`, `/agent/messages`, `/agent/clients`, `/agent/tasks`, `/agent/tours`, `/agent/analytics` | Routes, stores and API contracts exist; all live screens were not recertified in this audit |
| Representation permissions | Existing representation application rules and SQL | Verified/public Agent plus accepted representation required; existing tests cover invitation acceptance and access ending |

Owner Web paths in this table are relative to `apps/owner-web` unless explicitly prefixed. The implementation is layered through existing use cases and adapters; no new credential system is needed.

## Findings

### P1 Role intent can change silently during signup

The browser key `partner.onboarding.role` is global to the origin and not scoped to an account or active onboarding attempt. Signup writes it, and `WorkspaceSetup` rereads it at setup time. The setup page does not independently carry the role confirmed by the active signup journey. Another tab/account changing that shared value can replace the active intent.

Reproduction using isolated browser fixtures:

1. Select Property Agent and Continue; URL becomes `/sign-up?role=AGENT`.
2. Fill valid account details.
3. Change the shared cached role to OWNER before submission, representing a shared state update from another journey.
4. Submit signup and reach `/onboarding/setup`.
5. The page shows Workspace name and Create workspace, then calls POST `/me/owner-workspace`.

Control: with unchanged Agent intent, setup displays Professional name, calls POST `/agent/profile`, and reaches `/agent`. Both scenarios executed with synthetic intercepted provider/API responses. This confirms the drift mechanism, not that it was the exact sequence followed in the user's screenshots. It is not evidence of access to another organization's data.

Ticket: [Agent Onboarding Role Reliability #113](https://github.com/Masterkent11/rental-business-software/issues/113), P1 Backlog, parent signup task #107. No fix has been started during this audit.

Proposed acceptance after review: preserve explicit account/flow scoped intent through signup, refresh and confirmation/callback; missing or inconsistent intent must request a deliberate role choice. Agent setup must never call the Owner provisioning endpoint. Test another tab, account switching, storage unavailable, existing profile retry and explicit Change role. Keep the API identity and membership boundary unchanged.

### P1 Configured database is incompatible with the new Owner endpoint

Read only inspection through the configured API application connection confirms:

- Connection uses `rental_app`.
- `public.agent_profiles` exists, along with its own profile RLS policy.
- `public.organizations.onboarding_user_id` is absent.
- `organizations_partner_onboarding` insert policy is absent.
- A SELECT of the missing column with LIMIT 0 returns PostgreSQL `42703`; no user rows are read.

The new Owner repository reads that column for new users before creating the organization. The missing schema therefore blocks that path and is consistent with the reported 500. The exact original authenticated request stack was not available and is not claimed as captured. Current API `/health` returns 200, so the earlier screenshot's connectivity error and the later HTTP 500 should not be treated as identical events.

Existing ticket [Owner Workspace Provisioning #112](https://github.com/Masterkent11/rental-business-software/issues/112) was updated with this evidence; no duplicate Owner ticket was created. Its migration is local code and was tested in disposable PostgreSQL, but has not been applied to the configured database. Review the rollout and then verify authenticated retry behavior before treating Owner onboarding as operational. This audit does not authorize applying it.

### Acceptance gap Live provider and full Agent operations

The normal Agent UI journey passed against intercepted responses. Existing domain/marketplace integration tests exercise real database behavior, including registration, verification controls, representations, messaging, viewings, Agent workload and permissions. Neither result proves successful signup/email confirmation/Agent creation for the user's actual live account or complete browser acceptance of every Agent operation.

Do not mark the complete Agent platform missing, fully accepted or production ready from these screenshots. Reuse existing tracker records: #56/#57/#58/#100 for representation and #62/#63/#64 for dashboards. Security and live environment acceptance stay open.

## Evidence and checks

- [Browser cases and exact requested endpoints](verification/agent/browser.json): normal Agent path and reproduced wrong Owner path, zero observed page runtime errors.
- [Role drift screenshot](<verification/agent/Role Intent Drift.png>): synthetic fixture only.
- [Read only configured schema check](verification/agent/schema.json): metadata only, zero remote writes.
- [Check summary](verification/agent/checks.json): API health 200 and unauthenticated Agent profile 401.
- Existing tests executed: `bash scripts/test-isolated-db.sh src/domain/agents/__tests__/agent.test.ts src/infrastructure/postgres/__tests__/partner-marketplace.integration.test.ts` from `apps/api`, using supported Node 24.19.0. Result: 28 passed, zero failed or skipped in two files. The disposable cluster was cleaned up.

Supabase diagnostic guidance consulted: [Observability](https://supabase.com/docs/guides/observability). All conclusions above are tied to repository, test or metadata evidence; no provider credentials or session tokens are included in this report.

## Work order after review

1. Review the role drift ticket and confirm the bounded role persistence behavior.
2. Implement and test that gap using the existing signup and Agent contracts.
3. Review and separately authorize the Owner schema rollout tracked in #112.
4. Verify real Agent signup, confirmation, private profile creation, GET `/me`, workspace entry and failure recovery in the intended environment.
5. Continue existing representation/dashboard acceptance tasks; avoid duplicate feature implementation.

Current authorization: audit and tickets only for this follow up. No new product development has been performed. Historical approvals for previous implementation do not override the user's current audit first request.
