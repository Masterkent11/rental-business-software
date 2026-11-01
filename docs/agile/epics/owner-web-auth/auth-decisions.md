# Authentication decisions proposed for review

Status: PROPOSED, not accepted. This document does not supersede ADR-0007 or authorize backend/config/schema work.

## AD-01 Reuse identity and server authorization

Keep Supabase as credential authority and NestJS as business authorization authority. Retain SessionPort and focused use cases; presentation components do not call database clients. GET /me remains the workspace truth. Display name metadata is profile input only; never use editable metadata or selected role to grant OWNER/STAFF/AGENT verification or organization access. No new credential database or custom NestJS password endpoint.

## AD-02 Reconcile the session architecture before callback work

Current browser createClient persists tokens; architecture documentation describes SSR cookies and @supabase/ssr is installed but unused. Do not mix two independent session mechanisms. AUTH-006 must compare a coherent browser PKCE/callback flow with a reviewed SSR client/proxy flow against existing realtime, API bearer forwarding, account restoration, logout and deployment. Pick and record one bounded approach before implementation. Do not claim localStorage is httpOnly or that Supabase SSR cookies are inherently invisible to browser code. If SSR protection is chosen, validate identity on the server, preserve refresh cookies/cache headers and never trust a raw getSession user as authorization.

Official reference: [Supabase SSR clients and identity verification](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&queryGroups=framework).

## AD-03 Google and registration are real capability additions

The reference requires Google on phone/tablet. Existing V1 auth architecture excludes social login and current UI has none. Owner/product/security approval must explicitly reconcile this scope. Verify provider enabled state, consent/application configuration, authorized redirect URIs, confirmation policy and account linking behavior in the intended environment. Do not install another auth provider or silently enable Google. If provider is unavailable, document the fidelity gap and obtain a design decision; do not ship a placebo Google CTA.

[Google setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) and [redirect allowlists](https://supabase.com/docs/guides/auth/redirect-urls) are the primary sources. Local port 3200 and current local provider 3000 defaults need reconciliation if callbacks are approved. Do not weaken redirect validation to make them work.

Signup must handle both immediate session and email confirmation required responses. No mock credentials, demo values or automatic workspace privilege. Full name is validated profile data. Existing users with both roles use the same account; duplicate-account creation is not the role selection mechanism.

## AD-04 Role intent and provisioning

The supplied role screen is step 01/03 with Property Owner / Property Agent choices and a Continue button. Proposed order: role intent → account details → provider/verification outcome; exact later onboarding steps are not provided and require approval. Preserve existing post-login WorkspaceChooser for members with several actual workspaces. Role selection stores intended onboarding journey only and is revalidated server-side wherever provisioning occurs.

Agent profile setup already has an authenticated contract. Owner self-provisioning has no identified endpoint. Product must choose either the existing invitation/membership path or separately scope an idempotent, audited, authorized owner-organization setup capability. The latter requires a linked AUTH-006 technical subtask, threat model, integration tests, approved migration only if necessary, and rollback review. Do not invent an endpoint, mark onboarding complete prematurely or auto-verify agents.

## AD-05 Visual and functional reconciliation

Keep forgot-password reachable at every breakpoint even where a mockup crop omits it. Keep login/signup navigation and existing workspace/no-workspace behavior. Mobile signup back should preserve safe non-secret input and return to its approved previous step. Desktop Google is omitted in the matrix while mobile displays it: proposed placement is secondary beneath desktop primary action, pending explicit owner visual reconciliation. Do not silently change the reference or remove a working method.

Use one shared visual layout, brand variant, field/icon affordance, primary CTA and form surface; distinct Sign In / Sign Up forms and use cases own their data contracts. Do not make a generic form schema obscure auth state differences. Scope auth tokens/styles locally so the approved dashboard remains unchanged.

## AD-06 Recovery, legal and errors

Use the existing provider for reset requests and verified password changes, with safe redirect handling and no account-existence disclosure in reset acknowledgement. Existing sign-in distinguishes invalid credentials from confirmation-required; security review must decide whether to preserve or normalize that message. Keep detailed diagnostics out of user errors and never log secrets or callback tokens. Obtain approved terms/privacy content; visual legal links must navigate to real readable documents. No service role key is allowed in Owner Web.

## Changelog review

Supabase changelog index was fetched on 2026-11-01. Relevant notices reviewed: [legacy TLS cipher removal](https://supabase.com/changelog/cbc-tls-ciphers-deprecated), affecting older HTTP API clients, and [free-tier email template restrictions](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier). Validate supported browsers and actual email delivery/template availability before promising custom confirmation/recovery behavior. Neither notice authorizes changing the project or its provider configuration in this phase.
