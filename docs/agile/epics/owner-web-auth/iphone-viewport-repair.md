# iPhone authentication viewport repair

Date: November 2, 2026

Existing tickets: [AUTH 005](https://github.com/Masterkent11/rental-business-software/issues/108#issuecomment-6567316132) and [Render deployment incident](https://github.com/Masterkent11/rental-business-software/issues/81#issuecomment-6567316488). The scopes were recorded before source changes. No duplicate ticket was created.

## Findings

The callback and workspace setup put AuthLoading inside AuthFrame. AuthLoading imposed a full dynamic viewport height and an opaque background inside the glass form panel. This produced the oversized white rectangle in the supplied iPhone screenshot.

The deployed API health endpoint returned 200. OPTIONS /me from https://westayplace.vercel.app returned 204 without Access-Control-Allow-Origin. The old https://rental-business-software.vercel.app origin received the expected header. Render CORS_ORIGINS contained three older Vercel origins and omitted the current public domain. An unrelated origin also received no allowed origin header. This identifies a configuration problem independently of the visual defect.

## Local changes

AuthLoading now defaults to the compact, transparent 150px pending state. PartnerEntry explicitly requests the full page variant. A shared CSS module makes those styles available on direct protected route visits, before authentication route styles load. The full page variant honors dynamic viewport height and safe area padding. Reduced motion disables the spinner animation. Mobile authentication inputs use a 16px font; user zoom remains enabled.

No OAuth exchange, membership, tenant policy, API data access, database schema or authorization behavior was changed. No comments were added to source code. Preexisting .env.example edits and docs/design work were preserved.

## Verification

Node 24.19.0, Owner Web:

- Production build: passed, all 36 static pages generated.
- Typecheck: passed.
- ESLint: passed.
- Unit and architecture suite: 95 passed, zero failed.
- Existing partner authentication browser suite: passed. Eight reference captures, Owner and Agent onboarding, callback success and denial, recovery, keyboard selection and responsive reflow. Provider and API requests were intercepted with synthetic fixtures.
- New auth-viewport.browser.mjs: passed at 320x568, 375x667, 390x664, 430x740, 667x375, 834x1112 and 1440x900. Callback pending surface measured 150px at every size, remained transparent, respected reduced motion, had no horizontal overflow, and remained reachable. Portrait pending state fit the viewport. Expired callback returned to sign in. Direct protected route loading filled the viewport and remained centered without relying on auth route CSS.

Browser evidence is in /tmp/westayplace-auth-viewport/results.json and callback screenshots in that directory. Existing authentication regression captures are in /tmp/westayplace-auth-regression. Chromium was run through installed Google Chrome. WebKit and physical iPhone acceptance were not run; actual Safari browser toolbar and software keyboard behavior still need device verification.

## Production change

The user explicitly approved adding the exact https://westayplace.vercel.app origin, preserving all three existing origins, and redeploying only the currently deployed commit 9b5689c2d0a0a0079dad83e92ad838d8f708cf65. Render accepted the single key merge and automatically started deployment dep-dbjvfg0u01pc738kb63g at that exact commit. No additional deploy was triggered. No Git push or local frontend deployment was performed.

The deployment reached live at 2026-11-02T02:40:25Z. Subsequent checks passed:

- Production origin GET and POST preflights: 204 with Access-Control-Allow-Origin exactly https://westayplace.vercel.app, including requested authorization, content-type and x-organization-id headers.
- Previous primary Vercel origin: still allowed.
- Unrelated origin: no Access-Control-Allow-Origin.
- /health: 200 with the correct production origin header.
- Unauthenticated /me: 401 with the correct production origin header, preserving authentication enforcement.
- The existing authenticated Chrome production session visibly reached the Owner dashboard with heading Good day, Kent and its real workspace metrics. This verifies that session can load the portal after the change; a fresh live Google login and an Agent Google login were not run.

Sanitized HTTP evidence: /tmp/westayplace-cors-verification.json.

A separate production version gap remains: the browser reported /partner/branding as 404 against the historical API commit. The approved same commit redeployment intentionally does not publish newer local API endpoints. This is recorded under existing partner logo ticket #140; it does not prevent the observed dashboard from loading.

The local UI repair will not appear on Vercel until a separately authorized frontend release. No local frontend code was pushed or deployed.
