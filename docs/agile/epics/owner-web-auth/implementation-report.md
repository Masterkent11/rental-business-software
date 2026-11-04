# Owner Web authentication implementation review

Local review build on branch `codex/owner-auth-103`, based on `9b5689c`. No commit, push, merge, deployment or remote database change. Existing untracked planning, scripts and supplied assets are preserved.

## Result

First time entry opens Owner or Agent selection. Continue carries role intent to signup; email confirmation is handled truthfully, followed by workspace or private Agent profile setup. Existing users retain the original session store, real memberships and workspace chooser. Sign in, Google capability detection, PKCE callback, password recovery/update and existing legal content routes are wired through the application ports and adapters.

The final visual revision follows the latest feedback: solid white role form and opaque role options, shared dusk photograph, consistent sans serif typography, clean SVG building matching the reference's tall left volume and projecting right canopy, compact responsive sizing, functioning slide controls, and plain Sign in/Continue labels. Promotional text sits directly on the photograph over a continuous dark gradient. There is no enclosing promotional text card. The small property preview remains part of the supplied desktop composition. Mobile authentication retains its reference form surface; the request to remove glass applies to role onboarding.

## Review links

- [Role selection](http://localhost:3202/onboarding/role)
- [Create account](http://localhost:3202/sign-up?role=OWNER)
- [Sign in](http://localhost:3202/sign-in)
- [Role at laptop size](verification/screenshots/role-owner-1440x778.png)
- [Create account at laptop size](verification/screenshots/signup-1440x900.png)
- [Mobile role](verification/screenshots/role-375x812.png)
- [Browser results](verification/screenshots/results.json)
- [Provisioning decision](owner-provisioning-decision.md)
- [Current approval scope](approval-gate.md)

## Verification

| Check | Actual result |
| --- | --- |
| Owner Web typecheck | Passed |
| Owner Web ESLint | Passed |
| Owner Web unit/architecture tests | 72 passed, zero skipped |
| Owner Web production build | Passed, including all new auth routes |
| Required auth captures | Sign in and signup at 375×812, 834×1112, 1440×900 and 1920×1080 |
| Browser journeys | Both role flows, validation, immediate and confirmation required signup, private unverified Agent setup, invalid login, recovery request/password update, PKCE callback success/rejection, legal content, keyboard radios, slides and reflow passed |
| Responsive role evidence | 1440×778, 1420×700, 375×812 and 720×450; the last approximates a 200 percent viewport reduction, not a native browser zoom acceptance claim |
| Browser runtime errors | None observed in the automated journeys |
| API typecheck, lint and build | Passed |
| API unit run without DB | 409 passed, 214 integration tests skipped |
| Focused onboarding integration and unit tests | 9 passed in disposable PostgreSQL |
| Full disposable API suite | 622 passed, one existing invoice collection test failed |
| Failure baseline | Same invoice test failed without the new onboarding migration; baseline invoice suite 23 passed, one failed |

The existing invoice failure is `invoices.integration.test.ts:161`, claimedCentavos expected 1000000 but returned 0. The collection uses a UTC application month while SQL groups issued_at in the database timezone. A timezone month boundary is a likely cause based on the run date and those queries; this diagnosis is not a separately validated finance fix. No finance code or unrelated test was changed. The full API suite is not reported green.

Browser requests to the existing auth provider and API were intercepted with synthetic fixtures. These tests exercise actual UI, Supabase SDK, callbacks and frontend adapters, but do not prove hosted OAuth consent, SMTP, remote schema or live accounts. PostgreSQL onboarding tests separately execute the real repository and RLS against a disposable cluster. No existing user account or hosted database was modified.

## Asset provenance and remaining visual limits

Project photo: `apps/owner-web/public/assets/auth/villa-dusk-reconstructed.png`, 941×1672. Generated with the imagegen skill from the supplied two phone composite to reconstruct photo regions obscured by UI. It is not the original independent photograph. The shared brand and role illustrations are clean SVG approximations derived from the supplied references, not verified original brand masters. Floating preview uses the same photo and labels itself Property preview, without invented ratings or live listing claims. Exact font and original separate villa asset remain missing.

Image generation prompt: Extract/reconstruct only the full bleed background inside the left phone as a clean tall 9:16 architectural photograph. No phone, frame, chrome, logos, words, UI, forms, icons, buttons or glass card. Preserve deep blue sky and coral dusk clouds, dark cantilevered villa on the upper right, warm windows right, trees and sofa right, city skyline left/center and reflective infinity pool/terrace below. Reconstruct hidden branding and form areas continuously, without people, extra objects or redesign.

Generated source: `/Users/admin/.codex/generated_images/01a15a68-4cd4-72c1-998a-b1ba93647c0a/exec-9d9fa833-64f5-451d-aabb-899e1d8c9020.png`. No new package installation or lockfile change.

## Remaining acceptance and release work

The new Owner endpoint requires review and remote application of `20261031181420_partner_owner_onboarding.sql` before hosted Owner setup can function. No remote migration was applied. Agent setup uses the existing endpoint and stays HIDDEN and UNVERIFIED. Original asset fidelity, live provider/email/redirect validation, final legal approval, assistive technology review and native browser zoom acceptance remain pending. Existing legal documents are rendered as draft where supplied as draft by the API.

AUTH007 depends on the existing planned Storybook foundation; no competing Storybook installation was added. AUTH002 remains blocked on original assets. Other implemented auth tasks remain in review, and epic/acceptance work remains in progress. Nothing is Done; no PR or CI result is fabricated. The earlier 92 project records are preserved.
