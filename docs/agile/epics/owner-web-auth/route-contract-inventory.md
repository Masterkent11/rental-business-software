# Existing route, contract and state inventory

## Existing Owner Web

| Entry | Actual implementation | Contract or behavior |
| --- | --- | --- |
| Protected pages /, /properties, /account and /agent routes | app/(owner)/layout.tsx → components/owner/shell.tsx | Signed-out screen is inline at the requested URL |
| Sign In | components/owner/sign-in.tsx | Email + password; visibility; validation; busy and error states |
| Session orchestration | stores/use-session-store.ts; application/use-cases/session/session.use-cases.ts | Lifetime guards, sign in/out, initialize, refresh, workspace selection |
| Session abstraction | application/ports/session.port.ts | getCurrentSession, signIn, signOut, rememberWorkspace, refresh only |
| Supabase adapter | infrastructure/auth/supabase-session.adapter.ts | signInWithPassword → resolve /me; sign out on resolution failure |
| Browser session | infrastructure/supabase/browser-client.ts | createClient; persistent refresh; detectSessionInUrl false |
| API client | infrastructure/http/http-client.ts | Authorization bearer; explicit organization context; no-store; 20s timeout |
| Workspace derivation | domain/workspace/workspace.ts | Only actual memberships/agent profile produce available choices |
| No workspace | components/owner/shell.tsx and agent-setup.tsx | Existing agent profile setup; owner membership by existing organization |
| Signup, callback, reset, legal | None found | New proposed routes; not an existing capability |

Paths in this table are relative to apps/owner-web.

## Existing backend boundaries

| Endpoint | Source | Required boundary |
| --- | --- | --- |
| GET /me | modules/me/controllers/get-me.controller.ts; application/me/get-me/get-me.use-case.ts | Verified principal; returns profile, organizations, capabilities and optional agent profile |
| PATCH /me | same controller; application/me/update-my-profile | Authenticated displayName update, not permission elevation |
| POST /agent/profile | modules/agents/controllers/agent-workspace.controller.ts; application/agents/manage-agent-profile | Existing authenticated profile registration; platform controls verification |
| Organization and representation APIs | modules/agents/controllers/organization-agents.controller.ts | Live membership and representation authorization |
| JWT boundary | infrastructure/supabase/jwks-identity.provider.ts; application/identity/resolve-principal | Signature, audience, issuer and expiry; capabilities loaded from DB |

Paths in this table are relative to apps/api/src. No public owner organization creation/onboarding endpoint was identified in the controller inventory. This is a verified implementation gap for owner self-onboarding, not permission to add one without review.

## Proposed route map, pending approval

- /sign-in and /sign-up under a shared public auth route group; existing protected deep links continue through approved internal return navigation.
- /forgot-password and /reset-password for real recovery, with neutral email-request acknowledgement.
- /auth/callback and a confirmation landing route only after choosing one coherent session and PKCE/email callback design.
- /onboarding/role for role intent from the supplied reference; not a replacement for WorkspaceChooser.
- Terms and privacy destinations require actual owner-approved content or URLs. No # links or fake legal pages.

These paths are proposals. No routes have been added. Reject external return URLs, protocol-relative paths, javascript schemes and encoded bypasses; use an explicitly reviewed internal destination policy. Do not let an agent-only user redirect into owner data. Authenticated visitors to public auth pages should resolve current access, not loop between callbacks and guards.

## State obligations after approval

Model idle, invalid, submitting, service unavailable, invalid credentials, email confirmation needed, callback rejected, expired/reused recovery link, password update success, authenticated/no workspace, workspace selection, access denied and redirect states explicitly. Separate registration accepted without a session from authenticated registration. Preserve retryable user inputs; clear passwords and URL tokens appropriately. Never manufacture success from a client click or from a role query parameter.
