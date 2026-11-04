# Owner workspace provisioning decision

Status: implemented locally for review. Independent security review and remote migration approval are pending. Tracker: [Owner Workspace Provisioning #112](https://github.com/Masterkent11/rental-business-software/issues/112), native child of AUTH006 #109.

The user requested first visit role selection, account creation and subsequent Owner or Agent setup. Existing Agent profile creation can satisfy that journey with a hidden, unverified profile. Existing Owner contracts only read memberships; no operation can create a first workspace. A form without provisioning would leave a new Owner permanently without a workspace.

## Contract and authority

POST `/me/owner-workspace` accepts exactly `{workspaceName}`. The existing JWT resolver supplies the actor; the client cannot supply a user, organization, capability, role, verification state or publishing delegation. Domain validation normalizes the name. The controller, use case, repository port and PostgreSQL adapter follow the existing module boundaries. GET `/me` remains the source of actual workspace access.

The transaction verifies an active user, serializes concurrent calls for that actor, returns an existing owned workspace on retry, or inserts a DRAFT organization, OWNER membership and scoped capability together. It refuses reactivation of previously revoked onboarding membership. Choosing a role in the browser grants no authority over any existing organization.

## Threat model and tests

Risks include forged organization identifiers, privilege escalation through editable metadata, duplicate workspaces from retries, inactive accounts and revoked membership recovery. Strict DTO validation, verified actor context, rental_app RLS, an actor uniqueness index and transaction locking address these risks. Four controller/use case tests and five real PostgreSQL tests passed. Integration cases include concurrent retries, separate actors, forged creator/state/delegation inserts, revoked membership and inactive accounts. This evidence does not replace security review.

## Migration and rollback

`supabase/migrations/20261031181420_partner_owner_onboarding.sql` adds a nullable actor FK and unique partial index, plus a rental_app insert policy restricted to the current actor, DRAFT state and false publish delegation. It adds no anonymous or browser role grants and no security definer functions. Applied only to disposable local PostgreSQL.

Before hosted use, review and explicitly approve the remote migration. For rollback, disable the endpoint first. Preserve created organizations and memberships; export actor associations before considering removal of the policy/index/nullable column after dependency review. No automatic destructive rollback or data deletion is provided.

## Session scope

Retain the existing browser session client, session store and API bearer forwarding. Enable PKCE and manually exchange callback codes or verification token hashes through that same client. Callback results are cached to prevent duplicate consumption under React StrictMode. No competing SSR session store or custom credential database is introduced. Return navigation rejects external and encoded bypass destinations. Google availability is read from public provider settings and does not enable or configure the provider.

Outstanding: live confirmation and recovery email delivery, actual Google consent and redirect allowlists, security review, migration review and hosted end to end acceptance. No provider settings changed.
