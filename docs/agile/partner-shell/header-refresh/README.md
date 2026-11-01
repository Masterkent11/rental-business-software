# Partner header and Google refresh repair

Implemented November 1, 2026 under existing AUTH 006 and partner search/header ticket 139. The broad CSS audit remains paused.

## Behavior

Google settings checks now distinguish pending, enabled, explicitly disabled and failed states. The Google action is rendered disabled while checking instead of disappearing, settings requests bypass browser cache, and failed network/HTTP/parse checks show retry feedback. An explicitly disabled provider still cannot initiate OAuth. Sign in and signup use the existing PKCE adapter and callback; no permission or session architecture changes.

The shared toolbar now contains search, notifications and a reusable current account identity. The blue verified seal remains attached to the avatar. The personal identity footer was replaced with the existing working Sign out action. Owner and Agent navigation/workspace authorization remain separate and unchanged. Initials are used consistently with the existing personal avatar.

The mobile toolbar is one compact row; dashboard greetings move below it on mobile while desktop keeps greeting and search in one row. Notification and search popovers remain inside the viewport. Account profile/email and long verification labels reflow at 320px without shrinking the desktop composition. Existing palettes, dashboard photography and SVG illustrations are retained. No new stylesheet, dependency, source comment or competing design system was introduced.

## Source scope

- `components/auth/auth-forms.tsx`
- `infrastructure/auth/supabase-partner-access.adapter.ts`
- `components/owner/partner-identity.tsx`
- `components/owner/partner-toolbar.tsx`
- `components/owner/partner-verification.tsx`
- `components/owner/partner-shell.css`
- `components/owner/shell.tsx`
- `app/(owner)/account/page.tsx`
- `__tests__/google-availability.test.mjs`
- `__tests__/google-refresh.browser.mjs`
- `__tests__/partner-shell.browser.mjs`

Concurrent auth.css work was preserved without edits by this task. Existing staged files were not staged, unstaged, committed or pushed. Marketing regression captures were moved into this evidence directory and the prior staged screenshot working files restored exactly from their existing index blobs after the harness used its legacy output directory.

## Verification

See [verification manifest](evidence/verification.json), [logs](evidence/), [header screenshots](screenshots/), [Google refresh captures](auth/), and [auth regression](regression-auth/). Fresh Marketing regression evidence is in [its own directory](regression-marketing/).

93 unit tests passed. Typecheck, production build and diff check passed. Lint has zero errors and two existing unused variable warnings in messages-inbox.tsx. Header browser tests cover 20 dashboard/Account viewport combinations plus search, branding and verified drawer states. Google reload/retry tests cover both forms at four viewport sizes. Existing authentication and Marketing browser suites also passed.

The first header run retained an obsolete badge location assertion; it was corrected to the user approved avatar location. The next run exposed a real 320px pending verification badge overflow; wrapping was fixed. Final header and Google suites passed against the final production build. No failed test was relabeled as passing without a successful rerun.

Browser API/provider fixtures are synthetic. Earlier live local Owner Google entry reached its authenticated dashboard; live Agent Google acceptance remains pending the user's separate Agent account. New Google account variations and production deployment acceptance are not certified. Workspace logo persistence on the configured hosted backend retains the separately documented migration gate; mocked upload tests do not certify that hosted migration.

## Tracker evidence

Scope before code:

- https://github.com/Masterkent11/rental-business-software/issues/109#issuecomment-6556519151
- https://github.com/Masterkent11/rental-business-software/issues/139#issuecomment-6556519413

No new Epic or duplicate feature ticket was created, and sprint/parent history was preserved. No push, merge, deployment, remote migration or membership change.
