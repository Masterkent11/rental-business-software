# QA and acceptance plan

Status: planned, not executed for the new design. Screenshots captured for the proposed design: 0/8. Live authentication E2E, accessibility certification and security approval: NOT RUN / NOT APPROVED.

## Existing regression baseline

On installed Node 24.19.0, ran `node --experimental-strip-types --test __tests__/session-lifetime.test.mjs __tests__/partner-portal-domain.test.mjs` from apps/owner-web. Exit 0; 16 passed, 0 failed, 0 skipped. Covers lifetime races, duplicate submit, owner/agent workspace selection, route scopes and other existing domain behavior. It does not prove real Supabase login or new registration/recovery.

## Required screenshot matrix after approval

| Experience | Viewport | Proposed artifact | Current result |
| --- | --- | --- | --- |
| Sign In | 375 × 812 | signin-375x812.png | Not captured; implementation gated |
| Sign Up | 375 × 812 | signup-375x812.png | Not captured; implementation gated |
| Sign In | 834 × 1112 | signin-834x1112.png | Not captured; implementation gated |
| Sign Up | 834 × 1112 | signup-834x1112.png | Not captured; implementation gated |
| Sign In | 1440 × 900 | signin-1440x900.png | Not captured; implementation gated |
| Sign Up | 1440 × 900 | signup-1440x900.png | Not captured; implementation gated |
| Sign In | 1920 × 1080 | signin-1920x1080.png | Not captured; implementation gated |
| Sign Up | 1920 × 1080 | signup-1920x1080.png | Not captured; implementation gated |

Use stable browser version, CSS viewport, DPR 1 for comparable desktop images, loaded fonts/images and deterministic non-secret data. Capture default forms, then focus, invalid, busy, provider-disabled/unavailable and error states separately. Preserve original references unchanged. Human comparison must note differences; approved region crops may support review but are not recovered original source assets.

## Functional cases

| ID | Walkthrough / expected result |
| --- | --- |
| F01 | Signed-out protected deep link shows approved auth; valid credentials resolve /me and return only to an allowed accessible internal route |
| F02 | Invalid/missing email/password prevents request; submit by Enter and button behaves consistently; duplicate taps send once |
| F03 | Wrong credentials, unconfirmed email, offline, rate limit and /me failure show safe useful errors; no dashboard flash; retry preserves appropriate input |
| F04 | One owner workspace opens directly; owner+agent prompts or restores valid selection; unknown remembered key prompts; customer-only user cannot enter owner data |
| F05 | Signup validates full name, email and provider-aligned password rules; handles confirmation-required with no session and immediate-session separately |
| F06 | Existing account registration and sign-in fail safely; no fake success, leaked password or duplicate privileged membership |
| F07 | Google uses a genuinely enabled provider; callback code exchange succeeds; denied consent, invalid state, missing/reused code and unapproved redirect fail safely |
| F08 | Forgot password sends actual provider request with neutral acknowledgement; valid reset completes; expired/reused/wrong-origin links fail without exposing tokens |
| F09 | Logout clears identity, active workspace and private stores; late initialize/refresh/callback cannot restore old user; back navigation does not disclose previous data |
| F10 | Role cards support pointer and keyboard exclusive selection; Continue requires valid intent; selecting Owner does not grant organization access; selecting Agent does not verify license |
| F11 | Owner onboarding follows approved membership/provisioning contract; no-workspace and interrupted confirmation states remain recoverable |
| F12 | Sign In/Sign Up/back links preserve approved context; terms/privacy open real approved readable content; no placeholder destination |
| F13 | API refuses bad/expired/wrong-audience token, revoked membership, cross-org header and unrepresented agent access regardless of client display state |
| F14 | Existing realtime, workspace switch and token refresh still work under the selected session architecture; no duplicate auth listeners or refresh loops |

Use synthetic fixtures for deterministic UI/error coverage, then separately run real integration with explicitly provisioned test accounts in an approved non-production environment. Never treat a mocked JWT fixture as successful live authentication. Do not create real users, send reset email, alter provider settings or seed remote DB during planning.

## Responsive and accessibility checks

- Additional 320×568, 390×844, 768×1024 and 1024×768; portrait/landscape and safe areas; no horizontal page overflow at 320px.
- Browser zoom 200%, text scaling, keyboard open/closed, resize while focused and short viewport scrolling. Keep focused fields and primary/recovery controls reachable.
- Keyboard order, visible focus, native labels, autocomplete username/name/new-password/current-password, email keyboard, accessible errors tied to fields, announced async status, aria-busy and appropriate disabled state.
- Password visibility button updates name/state, retains cursor/focus and never submits; at least 44px targets where possible.
- Contrast over real image and glass, reduced transparency/motion handling without losing meaning, screen reader navigation and error summary focus.
- Role cards use an accessible radio group; do not convey selection with color alone. Phone/iPad role adaptations need owner approval before visual acceptance.

## Repository checks after implementation

Reuse package scripts, Node 24.19.0 and existing test systems. Owner Web: npm run typecheck, npm run lint, npm test, npm run build. If API changes are separately approved: the API AGENTS quality gates plus focused auth/access integration tests and disposable database isolation as required. Do not change provider settings just to get tests green.

Existing browser scripts use Playwright from an externally supplied package path and deterministic request interception. No declared Owner Web Playwright dependency or Storybook setup exists. Reuse/approve the test harness rather than adding packages in this phase. AUTH-007 depends on #86–#88 for the approved Storybook foundation and adds auth states only.

## Acceptance evidence

For each run record actual command, date, runtime, exit status, pass/fail/skip counts, screenshot artifacts and reviewer. PR/CI links are attached only when real. Product owner must review all eight images, design reconciliation decisions and differences register; security owner approves changed identity behavior; repository reviews/checks must pass. No implementation ticket becomes Done from a screenshot alone.
