## Google authentication configuration repair 2026 11 01

The user authorized Google sign in setup for Owner and Agent in Owner Web and supplied a Google `redirect_uri_mismatch` error. Reusing AUTH 006 and its existing parent; no new feature ticket or Epic.

Read only verification:

- Hosted Supabase public settings returned HTTP 200 with Google enabled.
- Supabase authorize returned HTTP 302 to Google using the existing Westayplace web client.
- The actual Google callback is `https://yoscanunnqbzmlnwzift.supabase.co/auth/v1/callback`.
- Google Cloud currently registers `http://localhost:3202/sign-in` as the sole authorized redirect URI. This differs from the actual provider callback.
- Existing app Google buttons, PKCE client and code exchange callback are already implemented. Identity does not grant partner access; current server membership resolution remains authoritative.

Bounded configuration repair:

1. Correct the existing Google web client redirect to the exact Supabase callback.
2. Keep the existing deployed JavaScript origin and add the active localhost origin if needed.
3. Inspect Supabase redirect allowlist for the actual app callback origins and approved next destinations.
4. Retry through the actual app; user completes Google consent. Record end to end acceptance only if callback, session and authorized destination succeed.

Acceptance: redirect mismatch removed; existing email sign in preserved; no extra scopes, credential rotation, manual identity linking, auto verification, schema, membership or business rule changes. No push or deployment. Google consent and real Owner/Agent end to end acceptance remain NOT RUN at this update.

## Verified configuration and local walkthrough

- Google Cloud was reread after saving and showed the exact Supabase callback in the existing Westayplace web client. Existing deployed JavaScript origin was preserved. No client secret was read, copied, changed or committed.
- Supabase Redirect URLs were initially empty and Site URL was `http://localhost:3000`.
- Added and verified persisted exact entries:
  - `http://localhost:3202/auth/callback?next=workspace`
  - `http://localhost:3202/auth/callback?next=onboarding`
  - `http://localhost:3202/auth/callback?next=recovery`
- Left the global Site URL unchanged; the requested callback now has explicit permission instead of falling back to the old default. No wildcard or unrelated host was added.
- Opened a fresh `http://localhost:3202/sign-in` tab, clicked Continue with Google, then observed authenticated `http://localhost:3202/` with heading Good day, Kent. No redirect mismatch was displayed in that attempt. Browser UI observation verifies the resulting Owner session and route; it is not an instrumented network trace of every redirect.
- The earlier flow_state_already_used page came from reusing an OAuth state. Retry through the app button rather than reloading an old provider/callback URL.
- Live Agent acceptance remains NOT RUN: the current Google identity resolves to an Owner workspace. Requested a separately authorized Agent Google test account from the user. No agent permission was created for the Owner account.
- New Google registration, identity linking variations, production callback and real provider recovery acceptance remain NOT RUN. Existing synthetic auth browser suite passed in this turn; that result is not real provider acceptance.
- No application source code, schema, membership policy, secrets, deployment or Git push was changed for this configuration repair. A concurrent auth.css change by another actor was detected and preserved.

## Primary references

- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/redirect-urls
- https://developers.google.com/identity/protocols/oauth2/web-server#authorization-errors-redirect-uri-mismatch

## Tracker

Existing AUTH 006: https://github.com/Masterkent11/rental-business-software/issues/109
Planning update: https://github.com/Masterkent11/rental-business-software/issues/109#issuecomment-6556111494
This configuration repair does not close the broader ticket or override its remaining acceptance gates.
