# Epic and eight planning tickets

All scopes below are planned or awaiting review. No implementation ticket is Done. Estimates are proposals pending team review; no iteration/assignee/project points are set. Native mapping is maintained in ticket-import/github-mapping.json.

## Existing work reconciliation

New scoped authentication epic is a child of existing product initiative #12; identity epic #14 stays intact and is related, not duplicated. #29–#31 are customer identity work; #32–#34 protect existing authorization/state. AUTH-007 depends on existing Storybook #86–#88 instead of duplicating setup. All 92 existing repository issues were inspected before creation. No matching auth keys/redesign were found.

## Proposed review estimates

| Key | Points proposed | Status | Dependencies |
| --- | --- | --- | --- |
| AUTH-001 | 2 | In Review | none |
| AUTH-002 | 3 | Blocked | AUTH-001 |
| AUTH-003 | 5 | Backlog | AUTH-001, AUTH-002, AUTH-006, AUTH-008 approval |
| AUTH-004 | 8 | Backlog | AUTH-001, AUTH-002, AUTH-006, AUTH-008 approval, AUTH-003 shared presentation |
| AUTH-005 | 5 | Backlog | AUTH-002, AUTH-003, AUTH-004 |
| AUTH-006 | 8 | Blocked | AUTH-001, AUTH-008 scoped architecture approval |
| AUTH-007 | 5 | Blocked | AUTH-003, AUTH-004, AUTH-005, existing #86, #87, #88 |
| AUTH-008 | 3 | In Review | AUTH-001, AUTH-002, AUTH-006 decision review, AUTH-003 through AUTH-007 for final acceptance |

## Verified live issue mapping

See [the nine verified issue links](ticket-import/README.md). Epic #103 is the native parent of #104–#111 in existing Project 3; all are open. No prior issues were modified.

## Epic payload

Planning key: WSP-AUTH-EPIC-01

## Objective and user story

As a property owner or property agent, I want an accessible, responsive and trustworthy authentication experience matching the supplied visual references, so that I can access or create the correct partner workspace without losing security or existing membership behavior.

## Scope and current behavior

- Scope: Owner Web only, apps/owner-web; existing NestJS identity/authorization contracts in apps/api are integration constraints.
- Current: real Supabase email/password sign-in plus backend /me and owner/agent workspace resolution. Signup, Google OAuth, callback/recovery and legal routes are absent from Owner Web.
- Target: reference-based Sign In and Sign Up at 375×812, 834×1112, 1440×900 and 1920×1080, with owner/agent onboarding intent from the supplied role pack.
- Phone/iPad use a full photo hero and frosted lower form; laptop/desktop use a white auth panel and photographic promo with floating villa card. Device/browser mockup chrome is excluded from the app.
- Preserve one identity, live membership authorization, existing one/multiple/no-workspace handling, logout and private-state invalidation.
- Existing related identity epic #14 and boundary story #32/#34 are preserved. Existing customer auth #29–#31 is not this redesign.
- Storybook foundation remains in #86–#88; AUTH-007 covers auth-specific states only.
- Out of scope: consumer Flutter redesign, replacing credential storage, silently enabling Google, unapproved backend/schema/dependency/provider changes, commits/pushes, merge or deployment during planning.

## Mandatory planning and approval status

The supplied Phase 1 task explicitly says DO NOT START DEVELOPMENT and requires review of the complete plan followed by explicit owner approval. Gate A is CLOSED. This epic records development intent and planning only; it does not represent design/security approval or implemented UI.

Owner approval: AWAITING OWNER APPROVAL. Design acceptance: pending. Security approval: pending. Implementation: NOT STARTED. New visual screenshots: 0/8. Live auth E2E: not run. Deployment: NOT DEPLOYED.

User confirmed on 2026-11-01 that only composite auth mockups are available and requested missing originals in the plan. Exact source villa/pool photo, floating-card asset/content, exact fonts and original auth brand variants remain unresolved; do not claim final pixel identity or substitute role imagery.

## Classification

- Work Type: Epic; Application Surface: Owner Web; Technical Layer: Cross Stack; Product Domain: Identity.
- Priority: P1; Delivery Status: Blocked; Record Classification: Planned Feature; Target Release: Production Readiness, no date.
- Proposed estimates are individually reviewable in children; no epic estimate, developer assignment or sprint is fabricated.
- Native parent: existing product initiative #12. Related #14 remains a separate preserved epic.

## Children and sequence

AUTH-001 audit → AUTH-002 visual/assets → AUTH-006 contract/security decisions + AUTH-008 owner Gate A → AUTH-003 Sign In → AUTH-004 Sign Up/role intent → AUTH-005 viewport verification → AUTH-007 auth coverage → AUTH-008 final acceptance. Storybook foundation dependencies remain #86–#88. Actual native child issue numbers are verified in the planning mapping.

## Acceptance criteria

- AC-01: Audit, route/contract inventory, immutable reference hashes, ticket mapping and missing assets are reviewable before product code changes.
- AC-02: Owner explicitly approves this complete plan and reconciles visual/functionality/provider/provisioning decisions before implementation; no invented approvals.
- AC-03: Both auth forms match approved compositions at all four exact CSS viewports, with 8/8 actual reviewed screenshots and explicit accepted differences.
- AC-04: Every visible control works through real approved contracts; no fake OAuth, legal links, credentials or success states.
- AC-05: Client role choice grants no server authority; membership, JWT verification, cross-organization controls and agent verification remain enforced.
- AC-06: Signup confirmation, password recovery, callbacks, redirects and configured Google states have actual functional/security evidence.
- AC-07: Keyboard, focus, labels, error announcements, reflow, zoom, safe areas and on-screen keyboard checks pass.
- AC-08: Required tests/checks, real PR/CI links, reviewer approval and asset exceptions are recorded before Done. Release approval remains separate.

## User walkthrough

1. Proposed after approval: I open Sign In or choose to create a partner account.
2. I use email/password or real approved Google and receive usable validation/loading/error feedback.
3. If registering, I follow the approved owner/agent intent and confirmation/membership setup without gaining privileges from role selection.
4. The backend resolves my actual accessible workspaces; I choose among them when needed.
5. I reach an allowed destination, recover access if needed and can sign out without leaving previous private data visible.

## Technical and QA boundaries

Reuse Next App Router, established form/design primitives, session use cases/port/adapter, Supabase identity and NestJS modular monolith. A verified new backend gap requires its own linked AUTH-006 decision/subtask, threat model, tests and specifically approved migration/rollback if needed. No competing auth architecture.

Current baseline verification on installed Node 24.19.0: 16 existing session/domain tests passed, zero failed/skipped. This is not live auth E2E, a new UI matrix or a security approval.

## Documents and evidence

Planning package: docs/agile/epics/owner-web-auth/ with README.md, audit.md, route-contract-inventory.md, visual-spec.md, asset-register.md/json, auth-decisions.md, qa-plan.md, dependencies-and-risks.md, approval-gate.md, visual-differences.md and complete ticket payloads/mapping. These files are local and not committed/pushed in Phase 1.

Audit baseline: 9b5689c2d0a0a0079dad83e92ad838d8f708cf65; recorded 2026-11-01 Asia/Manila. Canonical tracker is existing GitHub Project 3; no verified Jira WSP source of truth.


## AUTH-001 Existing authentication, repository and Agile audit

Planning key: AUTH-001

## Parent and classification

- Parent: WSP-AUTH-EPIC-01; actual GitHub mapping is recorded in this epic's planning package.
- Work Type: Task. Application Surface: Owner Web. Technical Layer: Cross Stack. Product Domain: Identity.
- Priority: P1. Status: In Review. Record Classification: Planned Feature.
- Proposed story points: 2, for team review only; no project estimate committed.
- Iteration and assignee: unassigned. Target release: Production Readiness, without an invented date.
- Dependencies: none before audit.

## Objective

Establish the factual route, session, workspace, architecture and canonical tracker baseline before design changes.

## Scope

- Inspect actual Owner Web routes, session store/use cases/adapter, shared UI, API identity boundary and repository rules.
- Reconcile all open/closed issues and prior sprint records; map this scoped redesign without recreating completed identity work.
- Document current runtime and baseline regression results, and distinguish source evidence from unverified hosted state.

## Subtasks

- [ ] Read AGENTS and governance/CI/architecture documents.
- [ ] Trace sign-in to Supabase and GET /me; inventory absent flows.
- [ ] Reconcile GitHub Project 3 and related #14, #29–#34, #86–#88.
- [ ] Review the audit with the owner and maintain provenance.

## Acceptance criteria

- AC-01: Audit names the real files, installed versions, current branch/commit and preserved uncommitted work.
- AC-02: Canonical Project 3 and repository access are verified; no Jira source of truth is asserted without evidence.
- AC-03: Original issue identities, completed tasks and historical sprint records remain intact.
- AC-04: Existing sign-in and owner/agent workspace behavior are documented without claiming missing OAuth/signup flows exist.
- AC-05: Baseline command/runtime/counts and explicit E2E limitations are recorded.

## User walkthrough

1. As a reviewer, I open audit.md and route-contract-inventory.md.
2. I follow the source paths to verify credentials, sessions and membership resolution.
3. I inspect related live issues and the provisional-to-actual ticket mapping.
4. I approve or return corrections without authorizing product implementation implicitly.

## Verification

- Review source inventory and all existing issue matches.
- Read supported Node 24.19.0 baseline: 16 passed, zero failed/skipped; live E2E not run.

## Blockers and approval

- Owner audit review pending; implementation gate remains closed.

Owner approval of the complete implementation plan: AWAITING OWNER APPROVAL. No product code, CSS, route, backend, dependency, provider or schema change is authorized by completion of this planning ticket. No implementation is marked Done. Live auth E2E and new visual acceptance have not run.

## Evidence and documents

- Audited baseline: 9b5689c2d0a0a0079dad83e92ad838d8f708cf65, planning recorded 2026-11-01 Asia/Manila.
- Local planning files, not yet committed or pushed: docs/agile/epics/owner-web-auth/audit.md, docs/agile/epics/owner-web-auth/route-contract-inventory.md.
- Auth references preserved as assets/auth-mobile-reference.png and assets/auth-responsive-matrix.png in that package.
- User confirmed composite-only authentication sources; missing originals remain listed, not silently substituted.


## AUTH-002 Mockup specification, measurements, and asset inventory

Planning key: AUTH-002

## Parent and classification

- Parent: WSP-AUTH-EPIC-01; actual GitHub mapping is recorded in this epic's planning package.
- Work Type: Task. Application Surface: Owner Web. Technical Layer: Design System. Product Domain: Identity.
- Priority: P1. Status: Blocked. Record Classification: Planned Feature.
- Proposed story points: 3, for team review only; no project estimate committed.
- Iteration and assignee: unassigned. Target release: Production Readiness, without an invented date.
- Dependencies: AUTH-001.

## Objective

Define a reviewable 1:1 visual contract and exact asset provenance for auth and role onboarding.

## Scope

- Preserve both auth composites byte-for-byte and inventory dimensions/hashes.
- Document phone/iPad photo-and-glass composition and distinct laptop/desktop splits.
- Inventory the supplied role pack, existing fonts/brand assets and missing original auth imagery.

## Subtasks

- [ ] Register immutable source references and SHA-256 hashes.
- [ ] Record approximate source bounds separately from proposed CSS tokens.
- [ ] List original photo/card/font/logo gaps and role inpainting/vector limits.
- [ ] Obtain owner decisions for each asset exception and unreadable marketing text.

## Acceptance criteria

- AC-01: Both copied references match original hashes and remain unchanged.
- AC-02: All eight target route/viewport combinations are specified; app output excludes simulated device/browser chrome.
- AC-03: The supplied role pack path and original 1585×992 reference are recorded, with role photo distinguished from auth photo.
- AC-04: Composite-only availability and missing original photo/card are explicit ASSET_BLOCKED items.
- AC-05: No generated/reconstructed substitute is represented as pixel-identical original artwork.
- AC-06: Every initial metric is labeled measured approximation or proposal; final exact parity remains unclaimed.

## User walkthrough

1. As the product owner, I open visual-spec.md beside both original composites.
2. I compare phone/tablet and laptop/desktop composition rules.
3. I inspect asset-register.md and the supplied role-screen reference.
4. I resolve missing assets or explicitly approve named limitations.

## Verification

- Compare source/copy SHA-256 and dimensions.
- Human review of typography, photo crop, panel proportions, controls and role asset provenance.

## Blockers and approval

- Original auth photo, villa thumbnail/content, exact font/brand sources missing.
- Owner has confirmed composite-only availability; no substitute or parity exception approved.

Owner approval of the complete implementation plan: AWAITING OWNER APPROVAL. No product code, CSS, route, backend, dependency, provider or schema change is authorized by completion of this planning ticket. No implementation is marked Done. Live auth E2E and new visual acceptance have not run.

## Evidence and documents

- Audited baseline: 9b5689c2d0a0a0079dad83e92ad838d8f708cf65, planning recorded 2026-11-01 Asia/Manila.
- Local planning files, not yet committed or pushed: docs/agile/epics/owner-web-auth/visual-spec.md, docs/agile/epics/owner-web-auth/asset-register.md, docs/agile/epics/owner-web-auth/asset-register.json, docs/agile/epics/owner-web-auth/visual-differences.md.
- Auth references preserved as assets/auth-mobile-reference.png and assets/auth-responsive-matrix.png in that package.
- User confirmed composite-only authentication sources; missing originals remain listed, not silently substituted.


## AUTH-003 Sign In interface implementation plan

Planning key: AUTH-003

## Parent and classification

- Parent: WSP-AUTH-EPIC-01; actual GitHub mapping is recorded in this epic's planning package.
- Work Type: Task. Application Surface: Owner Web. Technical Layer: Frontend. Product Domain: Identity.
- Priority: P1. Status: Backlog. Record Classification: Planned Feature.
- Proposed story points: 5, for team review only; no project estimate committed.
- Iteration and assignee: unassigned. Target release: Production Readiness, without an invented date.
- Dependencies: AUTH-001, AUTH-002, AUTH-006, AUTH-008 approval.

## Objective

Plan and, only after Gate A, deliver responsive Sign In matching the approved reference while preserving real session/workspace behavior.

## Scope

- Reuse existing session use case/adapter and shared form primitives; extract shared auth presentation only where useful.
- Plan full-photo/glass mobile+iPad and white-panel/photo-promo laptop+desktop layouts.
- Preserve existing recovery/navigation and workspace boundaries under the approved new route/deep-link policy.

## Subtasks

- [ ] Review proposed public auth route and protected-return handling.
- [ ] Specify reusable layout/brand/field/button/glass primitives and locally scoped auth tokens.
- [ ] After approval implement email/password visibility, validation, loading and safe failures.
- [ ] Verify real provider action only where approved/configured and compare Sign In screenshots.

## Acceptance criteria

- AC-01: No product code changes occur until the complete-plan Gate A is explicitly opened.
- AC-02: At each required viewport the Sign In hierarchy, copy, crop and form composition match the approved visual spec or recorded approved differences.
- AC-03: Email/password sign-in uses existing Supabase identity plus /me, never hardcoded credentials or manufactured success.
- AC-04: Blank/invalid/busy/error/confirmation-required states are usable; repeated submit sends once; visibility has an accessible functional control.
- AC-05: Successful login preserves allowed deep links and existing one/multiple/no-workspace behavior; inaccessible scopes remain denied server-side.
- AC-06: Forgot password and signup navigation work; configured Google has a real flow, otherwise its explicit design decision is honored.
- AC-07: Existing dashboard/sidebar styling and organization access controls do not regress.

## User walkthrough

1. Proposed after approval: As an owner or agent, I open an approved protected link or Sign In route.
2. I enter credentials, optionally reveal the password, and submit.
3. I recover from a validation/service error or use real recovery/Google when approved.
4. I enter only a workspace returned by the backend and reach an allowed destination.

## Verification

- Sign In screenshots at 375×812, 834×1112, 1440×900, 1920×1080.
- Keyboard/error/busy/deep-link and workspace regressions plus approved real auth test account walkthrough.

## Blockers and approval

- Gate A closed, exact auth assets missing, callback/recovery/Google decisions pending.

Owner approval of the complete implementation plan: AWAITING OWNER APPROVAL. No product code, CSS, route, backend, dependency, provider or schema change is authorized by completion of this planning ticket. No implementation is marked Done. Live auth E2E and new visual acceptance have not run.

## Evidence and documents

- Audited baseline: 9b5689c2d0a0a0079dad83e92ad838d8f708cf65, planning recorded 2026-11-01 Asia/Manila.
- Local planning files, not yet committed or pushed: docs/agile/epics/owner-web-auth/visual-spec.md, docs/agile/epics/owner-web-auth/auth-decisions.md, docs/agile/epics/owner-web-auth/route-contract-inventory.md, docs/agile/epics/owner-web-auth/qa-plan.md.
- Auth references preserved as assets/auth-mobile-reference.png and assets/auth-responsive-matrix.png in that package.
- User confirmed composite-only authentication sources; missing originals remain listed, not silently substituted.


## AUTH-004 Sign Up interface implementation plan

Planning key: AUTH-004

## Parent and classification

- Parent: WSP-AUTH-EPIC-01; actual GitHub mapping is recorded in this epic's planning package.
- Work Type: Task. Application Surface: Owner Web. Technical Layer: Cross Stack. Product Domain: Identity.
- Priority: P1. Status: Backlog. Record Classification: Planned Feature.
- Proposed story points: 8, for team review only; no project estimate committed.
- Iteration and assignee: unassigned. Target release: Production Readiness, without an invented date.
- Dependencies: AUTH-001, AUTH-002, AUTH-006, AUTH-008 approval, AUTH-003 shared presentation.

## Objective

Plan functional registration and role intent without granting workspace authority from a client selection.

## Scope

- Plan Full name, Email and Password plus real provider registration and confirmation semantics.
- Use the supplied owner/agent role-screen pack for approved onboarding intent; preserve existing post-login workspace selection.
- Identify owner invitation/provisioning gap and approved legal destinations without inventing backend endpoints.

## Subtasks

- [ ] Approve the role-intent/account/confirmation sequence and missing role steps/breakpoints.
- [ ] Specify typed registration and confirmation-needed/session-return states.
- [ ] Choose existing owner membership path or separately review the missing provisioning contract.
- [ ] After approval implement form/navigation/legal flows and reuse auth presentation.

## Acceptance criteria

- AC-01: Signup remains a future capability until Gate A and required contract decisions are approved.
- AC-02: Full name/email/password validate under the approved provider policy; demo screenshot values never become prefilled credentials.
- AC-03: Registration accepted without session shows accurate confirmation instructions, not an authenticated workspace.
- AC-04: Role selection is exclusive and accessible and stores intent only; it cannot create OWNER/STAFF authority or verify agents.
- AC-05: Agent setup reuses its real contract; owner setup follows an approved membership/provisioning path and is recoverable/idempotent where required.
- AC-06: Terms/privacy navigate to approved content, back/sign-in routes work and no placeholder controls exist.
- AC-07: Phone/iPad and laptop/desktop Sign Up layouts match the approved spec with documented asset constraints.
- AC-08: No schema, dependency or provider settings change occurs without separate explicit approval.

## User walkthrough

1. Proposed after approval: As a new partner, I choose an approved owner/agent onboarding intent.
2. I continue to account details, enter name/email/password or use approved Google signup.
3. I read legal content and submit once.
4. I complete required confirmation, then follow the approved membership/profile setup; I never gain privileges just by selecting a role.

## Verification

- Signup screenshot matrix and name/email/password/duplicate/account-existing cases.
- Real controlled confirmation-required and immediate-session cases only in an approved test environment.
- Role tampering, no-workspace, double-role, cross-org and interruption/retry checks.

## Blockers and approval

- Owner self-provisioning endpoint not found; product must choose membership path or approve a separate backend gap.
- Later role steps/mobile reference, provider policy, legal content and exact assets pending.

Owner approval of the complete implementation plan: AWAITING OWNER APPROVAL. No product code, CSS, route, backend, dependency, provider or schema change is authorized by completion of this planning ticket. No implementation is marked Done. Live auth E2E and new visual acceptance have not run.

## Evidence and documents

- Audited baseline: 9b5689c2d0a0a0079dad83e92ad838d8f708cf65, planning recorded 2026-11-01 Asia/Manila.
- Local planning files, not yet committed or pushed: docs/agile/epics/owner-web-auth/auth-decisions.md, docs/agile/epics/owner-web-auth/visual-spec.md, docs/agile/epics/owner-web-auth/route-contract-inventory.md, docs/agile/epics/owner-web-auth/dependencies-and-risks.md.
- Auth references preserved as assets/auth-mobile-reference.png and assets/auth-responsive-matrix.png in that package.
- User confirmed composite-only authentication sources; missing originals remain listed, not silently substituted.


## AUTH-005 Responsive layouts and viewport verification

Planning key: AUTH-005

## Parent and classification

- Parent: WSP-AUTH-EPIC-01; actual GitHub mapping is recorded in this epic's planning package.
- Work Type: Task. Application Surface: Owner Web. Technical Layer: Quality. Product Domain: Identity.
- Priority: P1. Status: Backlog. Record Classification: Planned Feature.
- Proposed story points: 5, for team review only; no project estimate committed.
- Iteration and assignee: unassigned. Target release: Production Readiness, without an invented date.
- Dependencies: AUTH-002, AUTH-003, AUTH-004.

## Objective

Verify the eight required authentication compositions and responsive usability without hiding fields behind glass or the keyboard.

## Scope

- Define deterministic screenshot capture for the exact four CSS viewport sizes and both experiences.
- Check small/short screens, safe areas, zoom/text scale, orientations and focus/keyboard behavior.
- Track visual differences against corresponding content regions instead of claiming a score from composite mockups.

## Subtasks

- [ ] Agree browser/DPR/font/state baselines and source-region mapping.
- [ ] Capture eight route/viewport screenshots after implementation.
- [ ] Review crop, font metrics, density, panel ratios, glass/controls/icons and every unresolved asset limit.
- [ ] Exercise 320px reflow, 200% zoom, keyboard and portrait iPad composition.

## Acceptance criteria

- AC-01: 8/8 actual screenshot artifacts exist at the specified viewports before visual acceptance is claimed.
- AC-02: 834×1112 remains a portrait photo/glass composition and laptop/desktop retain their separate approved panel proportions.
- AC-03: No horizontal page overflow at 320px and no essential action hidden at short height, zoom or keyboard open.
- AC-04: Images/fonts are loaded before capture and screenshots omit reference device/browser chrome.
- AC-05: Reviewer records differences and dispositions; missing assets are not waived silently.
- AC-06: Role-screen adaptations are compared only against explicitly approved additional references.

## User walkthrough

1. As a reviewer, I open the screenshot index and matching reference regions.
2. I compare each of eight default screens and key interaction states.
3. I resize/rotate/zoom, focus the lowest input and use the keyboard.
4. I accept or reject each discrepancy explicitly.

## Verification

- Eight default images plus state screenshots, overflow assertions and human visual comparison.
- Additional 320×568, 390×844, 768×1024, 1024×768 and 200% zoom.

## Blockers and approval

- New UI not implemented; 0/8 screenshots captured. Exact assets and font approval unresolved.

Owner approval of the complete implementation plan: AWAITING OWNER APPROVAL. No product code, CSS, route, backend, dependency, provider or schema change is authorized by completion of this planning ticket. No implementation is marked Done. Live auth E2E and new visual acceptance have not run.

## Evidence and documents

- Audited baseline: 9b5689c2d0a0a0079dad83e92ad838d8f708cf65, planning recorded 2026-11-01 Asia/Manila.
- Local planning files, not yet committed or pushed: docs/agile/epics/owner-web-auth/qa-plan.md, docs/agile/epics/owner-web-auth/visual-spec.md, docs/agile/epics/owner-web-auth/visual-differences.md.
- Auth references preserved as assets/auth-mobile-reference.png and assets/auth-responsive-matrix.png in that package.
- User confirmed composite-only authentication sources; missing originals remain listed, not silently substituted.


## AUTH-006 Authentication regression, accessibility, and security

Planning key: AUTH-006

## Parent and classification

- Parent: WSP-AUTH-EPIC-01; actual GitHub mapping is recorded in this epic's planning package.
- Work Type: Task. Application Surface: Owner Web. Technical Layer: Cross Stack. Product Domain: Identity.
- Priority: P1. Status: Blocked. Record Classification: Planned Feature.
- Proposed story points: 8, for team review only; no project estimate committed.
- Iteration and assignee: unassigned. Target release: Production Readiness, without an invented date.
- Dependencies: AUTH-001, AUTH-008 scoped architecture approval.

## Objective

Resolve real identity/authorization gaps and define regressions before any new signup, recovery or callback implementation.

## Scope

- Compare current browser session implementation with documented SSR intent; choose one coherent reviewed approach.
- Plan Google, email confirmation, password recovery, safe return navigation and actual owner/agent membership boundaries.
- Review accessibility, error disclosure and secret handling and scope backend work only when justified.

## Subtasks

- [ ] Record a reviewed session/callback technical decision and threat model.
- [ ] Verify intended environment redirect/provider/confirmation/SMTP settings without exposing keys.
- [ ] Approve owner onboarding membership/provisioning behavior; create a separate technical subtask if backend change is needed.
- [ ] After approval test provider errors, expired/reused callbacks, access revocation, cross-org and logout races.
- [ ] Review labels, focus, error announcements, contrast, autocomplete and role-radio keyboard behavior.

## Acceptance criteria

- AC-01: The selected architecture reconciles docs and implementation without two competing session sources.
- AC-02: Server authority comes from JWT validation and live DB membership, never user_metadata or role intent.
- AC-03: External/protocol-relative/encoded-bypass return URLs and invalid callback state/code are refused.
- AC-04: Signup confirmation-needed and recovery states are accurate, with no token logging or account-existence disclosure in reset acknowledgement.
- AC-05: Google is real and configured before accepted use; provider/config/dependency/schema changes require separate scoped approval.
- AC-06: Any backend gap has a linked decision/subtask, negative auth tests, contract/threat model and approved migration/rollback if needed.
- AC-07: Keyboard/screen-reader/error/contrast/200% zoom checks have actual evidence before acceptance.
- AC-08: Existing session lifetime/workspace isolation and realtime/API behavior pass regressions.

## User walkthrough

1. As a security reviewer, I trace login/callback/provider identity into /me and workspace membership.
2. I attempt disallowed redirects, invalid tokens and unauthorized organization access.
3. I exercise confirmation/recovery failures and logout while requests are pending.
4. I review accessibility and approve only evidenced behavior and specifically scoped changes.

## Verification

- Baseline session/domain tests currently 16 passed; new live auth/E2E/security checks remain planned.
- Approved non-production users for actual sign-in/signup/recovery; simulated tests separately labeled.

## Blockers and approval

- No reviewed session/provisioning/social-login decision or provider configuration evidence.
- No permission to mutate provider settings or backend/schema in this phase.

Owner approval of the complete implementation plan: AWAITING OWNER APPROVAL. No product code, CSS, route, backend, dependency, provider or schema change is authorized by completion of this planning ticket. No implementation is marked Done. Live auth E2E and new visual acceptance have not run.

## Evidence and documents

- Audited baseline: 9b5689c2d0a0a0079dad83e92ad838d8f708cf65, planning recorded 2026-11-01 Asia/Manila.
- Local planning files, not yet committed or pushed: docs/agile/epics/owner-web-auth/auth-decisions.md, docs/agile/epics/owner-web-auth/qa-plan.md, docs/agile/epics/owner-web-auth/route-contract-inventory.md, docs/agile/epics/owner-web-auth/approval-gate.md.
- Auth references preserved as assets/auth-mobile-reference.png and assets/auth-responsive-matrix.png in that package.
- User confirmed composite-only authentication sources; missing originals remain listed, not silently substituted.


## AUTH-007 Storybook and visual regression coverage

Planning key: AUTH-007

## Parent and classification

- Parent: WSP-AUTH-EPIC-01; actual GitHub mapping is recorded in this epic's planning package.
- Work Type: Task. Application Surface: Owner Web. Technical Layer: Design System. Product Domain: Identity.
- Priority: P2. Status: Blocked. Record Classification: Planned Feature.
- Proposed story points: 5, for team review only; no project estimate committed.
- Iteration and assignee: unassigned. Target release: Production Readiness, without an invented date.
- Dependencies: AUTH-003, AUTH-004, AUTH-005, existing #86, #87, #88.

## Objective

Add authentication-specific visual/interaction coverage through the already planned Storybook foundation without duplicating it.

## Scope

- Reuse existing UI primitives and the canonical future Storybook setup tracked in #86–#88.
- Specify Sign In/Sign Up and shared auth component states with synthetic, isolated contracts.
- Keep provider/session operations mocked in component stories while separating real E2E acceptance.

## Subtasks

- [ ] Reconcile foundation readiness with #86–#88; do not open another setup ticket.
- [ ] List auth state stories for default, focus, invalid, loading, service error and configured/unavailable provider.
- [ ] After setup and approval implement isolated auth stories and visual checks.
- [ ] Attach screenshot/state evidence and accessibility interactions to the auth epic.

## Acceptance criteria

- AC-01: No new Storybook installation or dependency is made in planning.
- AC-02: Foundation work remains owned by #86–#88 and AUTH-007 owns only auth-specific coverage.
- AC-03: Stories cover both forms and shared primitives with empty/focus/invalid/busy/error/provider states.
- AC-04: Stories cannot call production Auth, send email, create users or expose tokens.
- AC-05: Visual tests use approved assets and controlled viewports; mocked story success is never claimed as live auth success.
- AC-06: Coverage/evidence is linked to actual PR/CI only when those exist.

## User walkthrough

1. Proposed after approval: As a maintainer, I open the existing approved Storybook catalog.
2. I select an auth form and switch states without contacting production.
3. I inspect focus, loading, errors and responsive composition.
4. I run the approved visual checks and link their actual artifacts.

## Verification

- Auth-specific component/interaction/visual tests after canonical setup.
- Separate component fixture results from provider integration runs.

## Blockers and approval

- No Storybook configuration or stories found; foundation #86–#88 is planned.
- UI and dependencies not approved for development.

Owner approval of the complete implementation plan: AWAITING OWNER APPROVAL. No product code, CSS, route, backend, dependency, provider or schema change is authorized by completion of this planning ticket. No implementation is marked Done. Live auth E2E and new visual acceptance have not run.

## Evidence and documents

- Audited baseline: 9b5689c2d0a0a0079dad83e92ad838d8f708cf65, planning recorded 2026-11-01 Asia/Manila.
- Local planning files, not yet committed or pushed: docs/agile/epics/owner-web-auth/audit.md, docs/agile/epics/owner-web-auth/qa-plan.md, docs/agile/epics/owner-web-auth/dependencies-and-risks.md.
- Auth references preserved as assets/auth-mobile-reference.png and assets/auth-responsive-matrix.png in that package.
- User confirmed composite-only authentication sources; missing originals remain listed, not silently substituted.


## AUTH-008 QA acceptance criteria and approval gate

Planning key: AUTH-008

## Parent and classification

- Parent: WSP-AUTH-EPIC-01; actual GitHub mapping is recorded in this epic's planning package.
- Work Type: Task. Application Surface: Owner Web. Technical Layer: Quality. Product Domain: Identity.
- Priority: P1. Status: In Review. Record Classification: Planned Feature.
- Proposed story points: 3, for team review only; no project estimate committed.
- Iteration and assignee: unassigned. Target release: Production Readiness, without an invented date.
- Dependencies: AUTH-001, AUTH-002, AUTH-006 decision review, AUTH-003 through AUTH-007 for final acceptance.

## Objective

Make owner/design/security and release approvals explicit and prevent planning completion being misreported as implemented UI.

## Scope

- Maintain Gate A before code, Gate B visual/functional acceptance and Gate C changed backend/security review where applicable.
- Review epic/eight-ticket plan, missing assets, decisions and exact acceptance evidence.
- Retain branch/PR/check/review and production deployment as distinct authorization events.

## Subtasks

- [ ] Present the complete plan and required owner decisions.
- [ ] Record actual owner approval or corrections with scope and date on the epic.
- [ ] After implementation reconcile all eight screenshots, auth E2E, accessibility/security evidence and unresolved deviations.
- [ ] Require real PR/CI links and reviews before completion; no auto-merge or deployment.

## Acceptance criteria

- AC-01: Gate A stays closed until the owner reviews the complete plan and explicitly approves implementation scope.
- AC-02: No approval comment/identity/date is fabricated; screenshot-target intent alone is not complete-plan approval.
- AC-03: All unfinished implementation issues remain open and are not marked Done.
- AC-04: Exact asset limitations, Google/recovery placement, role provisioning, legal content and architecture decisions receive explicit dispositions.
- AC-05: Final acceptance includes 8/8 reviewed screenshots and actual functional/accessibility/security results with clear blockers.
- AC-06: No commit, push, merge or deployment occurs in this planning phase.
- AC-07: Final report ends AWAITING OWNER APPROVAL — NO DEVELOPMENT STARTED.

## User walkthrough

1. As the owner, I open the full plan and ticket mapping.
2. I review missing assets and architecture/flow decisions.
3. I explicitly approve a scoped implementation plan or request corrections.
4. Later, I review actual test/screenshot/PR evidence before authorizing completion or release.

## Verification

- Check approval record, status matrix, reference hashes and file-change boundary.
- Confirm there is no product diff or claimed PR/deployment in Phase 1.

## Blockers and approval

- Complete-plan owner approval, final visual acceptance and security signoff are absent.

Owner approval of the complete implementation plan: AWAITING OWNER APPROVAL. No product code, CSS, route, backend, dependency, provider or schema change is authorized by completion of this planning ticket. No implementation is marked Done. Live auth E2E and new visual acceptance have not run.

## Evidence and documents

- Audited baseline: 9b5689c2d0a0a0079dad83e92ad838d8f708cf65, planning recorded 2026-11-01 Asia/Manila.
- Local planning files, not yet committed or pushed: docs/agile/epics/owner-web-auth/approval-gate.md, docs/agile/epics/owner-web-auth/qa-plan.md, docs/agile/epics/owner-web-auth/planning-report.md.
- Auth references preserved as assets/auth-mobile-reference.png and assets/auth-responsive-matrix.png in that package.
- User confirmed composite-only authentication sources; missing originals remain listed, not silently substituted.

