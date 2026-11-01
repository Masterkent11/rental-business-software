# Partner shell improvements

Requested 2026 11 01. Registered before product code: dashboard UI issue 64, search issue 139, branding issue 140. Parent story 62. All are in GitHub Project 3. Existing history is preserved. Jira is unavailable. User confirmed the new Partner Experience iteration for November 1–14, 2026. Issues 64, 139 and 140 are assigned to that iteration; GitHub readback verified the two feature assignments.

## Design and architecture

Keep the current Owner and Agent dashboards and their separate features. Add one shared top toolbar, place a compact blue verification seal beside the profile avatar only for verified partner workspaces, and show workspace branding separately from the personal account footer. No workspace switch arrows.

Search uses authenticated NestJS adapters, a dedicated application use case and repository port, and tenant scoped PostgreSQL reads. Exact title and prefix matches rank above token matches. Each query has a short input bound, bounded output and stable ordering. Navigation suggestions are role specific. Browser requests are debounced, cancelled and fenced by session and workspace identity. Search terms are not persisted or logged.

Partner branding is private workspace configuration, not a personal avatar or arbitrary image URL. A small decoded JPEG, PNG or WebP is normalized to a maximum 256 pixel WebP, stripped of metadata and bounded to 128 KiB. The private database stores only this normalized logo with Owner organization or Agent profile ownership. This avoids a public bucket or expiring signed URL for a small asset. Owner administrators and the Agent owner may write; active staff may read only. Existing database identity helpers, RLS and server policies remain authoritative.

## Migration and rollout

Additive private table with exclusive Owner or Agent foreign keys, indexed unique ownership, forced RLS and application role privileges only. No anonymous or browser database access. Local rehearsal only. If the migration is absent the branding API returns an explicit unavailable state; search and dashboard stay usable. Do not apply to the configured Supabase project without separate authorization.

## Verification

Pending implementation. Record executed commands, test counts, browser captures and limitations before acceptance. No commit, push, deployment or production data changes.

## Delivery details

The shared toolbar owns keyword search and notifications. Following the avatar correction, verification is represented by a blue check seal on the sidebar profile avatar, with an accessible workspace status label. Unverified avatars remain plain and detailed status remains in Account. The sidebar workspace block uses the partner logo or a consistent building fallback; personal name and email appear only in the account footer. No workspace dropdown was added.

Account supports upload, replacement, persisted reload, removal and recoverable validation failures. The backend accepts up to 2 MiB and decodes an actual still image, then stores a maximum 256 pixel WebP with alpha preserved and metadata removed. Logos are private in `app_private.partner_branding` and have no public bucket or signed URL. Branding and search use dedicated ports and granular use cases; UI state follows the existing Zustand convention. A provider instance is keyed by authenticated user and workspace. Disposal cancels reads, clears sensitive state and fences late search or upload completion.

Search covers authorized listing titles and locations, inquiry customer names and listing/stage summaries, and Agent clients and unfinished tasks. All words must match, ignoring case and common Latin accents. Exact title, title prefix and word prefix matches rank before other contained matches, with deterministic ties. Query limits: 80 characters, six words, two character minimum, twelve backend results, 250 ms browser debounce and 2.5 second SQL timeout. Up to three role appropriate page shortcuts remain available when the API fails. No search terms are persisted. This is keyword search; typo correction and semantic search are outside this ticket.

Result destinations use canonical portal routes. Property opens its details, inquiry opens the selected lead, and Client/Task destinations focus the matching row. DOM focus waits for async rows without changing authorization. Existing list pagination limits still apply to Client/Task screens; deeper record navigation beyond their loaded window is a follow up, not a new detail endpoint in this scope.

## Release and rollback boundaries

Migration: `supabase/migrations/20261101052951_partner_workspace_branding.sql`. It depends on the earlier reviewed local tenant boundary migration and its lifecycle helpers. The configured Supabase database has not been changed. Missing branding schema returns a sanitized 503 with `PARTNER_UNAVAILABLE`, while the sidebar uses its fallback. Search uses the existing resolved Principal, explicit organization or Agent predicates and existing RLS/representation helpers; it does not require the branding table or new tenant helper functions. The separate tenant boundary cutover remains necessary for the wider strict database isolation delivery. A read only check on the configured database verified that both the new branding table and earlier tenant lifecycle helper are absent; no remote write occurred.

Before a separately authorized cutover, run preflight and capture the configured database migration state, back up branding if it already exists, apply only the approved pending sequence, and verify hosted authorization with real test identities. Roll back application routing first; retain the additive branding table and logo data during application rollback. Dropping the table deletes logos and requires a separate reviewed backup/data removal decision. No destructive rollback SQL was executed.

## Executed verification

All results below were executed locally on 2026 11 01. The evidence directory contains command logs and a machine readable verification record.

- API and Owner Web typecheck, lint and production builds passed.
- Owner Web: 91 tests passed, zero skipped.
- API unit run: 444 passed, 251 database dependent tests skipped in that run.
- Three relevant real PostgreSQL and Nest HTTP suites: 29 passed, zero skipped. This covers exact/prefix/accent ranking, Owner A/B and Agent A/B boundaries, staff restrictions, wildcard escaping, malformed requests, raw RLS, missing branding schema, logo persistence/removal and membership revocation/suspension.
- Additive migration and baseline restore rehearsal preserved organization, Agent, membership and listing counts `[4, 1, 1, 7]`. The disposable cluster now explicitly uses UTF8, matching the hosted database encoding; the first ASCII fixture exposed an accent ranking test failure which was resolved by correcting that fixture configuration.
- Shared toolbar browser suite passed for Owner and Agent at 375x812, 834x1112, 1440x900 and 1920x1080. Verified badge visibility, no horizontal overflow, keyword results, Owner organization header, keyboard navigation, stale query cancellation, error/page shortcut fallback, persisted logo reload, upload/removal and invalid file feedback. Eight responsive captures and two Account captures are in screenshots.
- Existing Agent and Owner dashboard browser regressions passed. The Owner test now recognizes authenticated shared partner endpoints with either of its genuinely authorized synthetic organization IDs.
- Existing local API smoke: health 200; search and branding without bearer both 401.
- `git diff --check` passed. No source comments were added.

Browser Auth/provider/API calls are synthetic interceptions. Actual HTTP controller and database authorization is verified separately against disposable PostgreSQL. Hosted authenticated end to end, configured Supabase logo persistence and remote migration application are NOT RUN. These remain explicit release gates. No commit, push, merge, deployment or production data mutation occurred.


## Dashboard placement correction

The user corrected the first preview: the search belongs absolutely inside the existing photo header, beside the Good day greeting on a single row. This correction was recorded in existing issues 64 and 139 before code. DashboardHeader now consumes the shared toolbar through a composition slot; the shell renders the standalone toolbar only on other routes. Search, verification, notifications and navigation retain the same implementation and tenant scoped store. Header positioning reserves space for the greeting and preserves Owner actions beneath the title row. Responsive layouts keep greeting and search side by side inside the banner. No backend or schema change belongs to this correction.

Browser verification additionally checks that the toolbar is a direct child of the dashboard header, computed positioning is absolute, the header begins at the top without a preceding toolbar, greeting and search do not intersect, and their vertical centers share one row. Updated screenshots replace the first preview after these assertions pass.

Placement correction verification: typecheck, lint, production build, 91 frontend tests and both existing dashboard browser regressions passed. The shared header browser suite passed all eight Owner/Agent viewport checks with absolute placement, side by side geometry and dropdown/keyboard behavior. Updated captures were visually inspected at desktop and mobile. Evidence is in evidence/header-placement and screenshots/results.json. No backend, migration or remote release action was performed.


## Avatar verification correction

The user moved verification out of the header controls. Existing UI issue 64 recorded this correction before code. The shared PartnerVerificationBadge renders a compact blue scalloped check with a white checkmark and white separation ring at the avatar edge. Both Owner and Agent use actual active workspace verification from the authenticated session; an unverified workspace receives no seal. The accessible label explicitly identifies partner workspace verification, not personal identity verification. Account retains detailed status. The notification area no longer renders verification, and the single row banner search is preserved. No permissions, API, identity records or schema were changed.

Avatar correction verification: typecheck, lint, build and 91 frontend tests passed. The shared browser suite passed unverified Owner and Agent at four sizes plus verified avatar and mobile drawer checks for each portal, including actual blue color, avatar geometry, absence of a header seal and preserved single row search. Both existing dashboard regression suites passed. Updated verified avatar/drawer captures were visually inspected. Evidence: evidence/avatar-verification and screenshots. No push or deployment.
