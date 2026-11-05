# Facebook Page integration

Review draft for [#123 Secure Social Account Connections](https://github.com/Masterkent11/rental-business-software/issues/123) and [#125 Facebook Page Content Publishing](https://github.com/Masterkent11/rental-business-software/issues/125), under [Marketing Hub #114](https://github.com/Masterkent11/rental-business-software/issues/114).

## First delivery

In Marketing Hub → Connected Channels, an eligible Agent connects a Facebook Page they can publish to. The Agent chooses the Page after Meta consent and can disconnect it from the same screen. From a saved draft, the Agent previews the selected Page, caption and media, then explicitly confirms Publish. Start with a caption post, a single photo post and a single uploaded Reel. Scheduling, bulk posting, personal profiles and publishing on a delegated Owner Page are outside this delivery. Instagram and TikTok keep their own authorization and delivery contracts.

| Story | Acceptance |
| --- | --- |
| #123 | Connect and disconnect an eligible Page; a cancelled, expired, replayed or mismatched callback cannot create a connection; tokens never reach the browser or application logs; one Agent cannot list or modify another Agent’s connection. |
| #125 | Publish to the Page selected at confirmation; recheck Agent, draft, Page and represented property access before sending; confirm provider publication before showing Published; reconcile ambiguous results without sending duplicates. |

## Provider setup

- Use a Westayplace Meta app in development mode and a dedicated test Facebook Page managed by a permitted tester. Verify the Page publishing use case, Graph API version, exact OAuth callback URL and requested scopes in the Meta app dashboard. Scope candidates to confirm: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`. Request only the scopes needed by the verified flow.
- Meta’s [Facebook API collection](https://www.postman.com/meta/facebook/documentation/r56bjfd/facebook-api?entity=request-23987686-0b79260c-96bd-49de-875b-6076213785fc) demonstrates discovery via `/me/accounts` and the Page token and tasks returned by Meta. The official [Pages publishing guide](https://developers.facebook.com/docs/pages-api/posts/) returned HTTP 429 during this check; confirm the feed and photo request contracts against the selected API version before wiring them up. Meta’s [Reels collection](https://www.postman.com/meta/facebook/request/rgkn91u/1-create-reel) documents session creation, upload, finish and status verification.
- Keep the app secret and token encryption key in the server secret store. Configure the callback for the target environment exactly; provider secrets never go into source control or frontend configuration. Verify required permissions and review requirements before enabling connections for external partners.

## Implementation sequence

1. Extend the existing NestJS Marketing module. Add application ports for channel authorization and publication, with Meta adapters under infrastructure. Keep drafts, connections and delivery records separate. Scope new records to the authenticated Agent and use the existing tenant context and access rules.
2. Persist a random, short lived OAuth state as a digest, bound to the initiating Agent and consumed once. Exchange the code server side. Reauthorize the Agent when selecting a Page; use Meta’s returned Page tasks and show only safe Page metadata. Encrypt the selected Page token using authenticated encryption and store its key version. Disconnect removes the stored credential and blocks pending deliveries. Keep sanitized audit events for connect, disconnect and publish outcomes.
3. For Publish, persist an attempt keyed by Agent, draft version and destination before contacting Meta. Use the existing private media store. Validate media readiness and provider limits before send; for the first release use server controlled upload, with no user supplied remote media URL. On an ambiguous response, retain the attempt and available provider IDs for status reconciliation. Disable repeat submission while an attempt is unresolved. Show Published only after provider confirmation; otherwise show Processing, Failed or Needs attention as applicable.
4. Exercise cancellation, callback replay, revoked credentials, cross Agent reads and writes, revoked property grants, duplicate submissions and upload or publish timeouts in local tests. Then run the upload → save → reopen flow plus one post and one Reel against the approved test Page, and verify the resulting items directly on the Page.

## Environment status

The Facebook Page connection flow is implemented for local verification. It supports one connected Page per Agent. The API checks granted scopes and Page tasks, keeps OAuth state valid for ten minutes, and stores Page tokens encrypted with AES-256-GCM. Selecting a Page removes the other candidate credentials from the pending attempt. Disconnecting removes the stored Page credential and records an audit event.

For a live test, register the exact URL `<owner-web-origin>/agent/marketing/facebook/callback` in the Meta app. Use the same URL as `META_FACEBOOK_REDIRECT_URI` in the API environment. Set `META_FACEBOOK_APP_ID`, `META_FACEBOOK_APP_SECRET`, `META_FACEBOOK_GRAPH_VERSION`, and `META_FACEBOOK_TOKEN_KEY` on the API. Choose the Graph version supported by the app and generate a 32-byte key with `openssl rand -hex 32`. Keep the key stable across restarts. Run the Facebook Page connection migration on the test database before enabling the integration.

The WeStayPlace Facebook Login for Business configuration was created with ID `1105293035469748`. Use these values in the production API environment at rollout.

```dotenv
META_FACEBOOK_APP_ID=1087349757627157
META_FACEBOOK_LOGIN_CONFIG_ID=1105293035469748
META_FACEBOOK_REDIRECT_URI=https://westayplace.vercel.app/agent/marketing/facebook/callback
```

The earlier Meta settings check recorded **Client OAuth login**, **Web OAuth login**, HTTPS, strict redirect matching and the exact production redirect URI as configured. The latest **Configurations** check confirmed that configuration `1105293035469748` issues a user access token and lists `business_management`, `pages_show_list`, `pages_read_engagement` and `pages_manage_posts`. The API verifies that Meta actually grants the three required Page permissions before listing Pages. The Meta app is unpublished. Live grants, any requirement for `business_management` and Advanced Access for external partners have not been verified.

In the Agent Portal, open **Marketing Hub → Connected Channels → Connect Facebook**, complete Meta consent with the test account, select the test Page, and verify the Page name remains visible after reload. Then disconnect and verify the connected Page disappears. Local tests cover the full sequence with simulated Meta responses and disposable PostgreSQL. A live Meta consent test and publishing under #125 remain pending.

The hosted Marketing API returned `404` from Render commit `9b5689c` during the release check. The Marketing routes are present in merged commit `2da43ef`. The linked database lacked the Marketing tables and private bucket, and preflight found one account with overlapping Owner and unverified Agent membership to review before the tenant migration.

The supplied production callback and the Render Facebook channel endpoint both returned `404` on the latest check. Render's `/health` returned `200`. The live consent test depends on releasing the callback and API routes, verifying the database prerequisites and configuring the server secrets.

## Local portal recovery

[Marketing Testing and Release Acceptance #137](https://github.com/Masterkent11/rental-business-software/issues/137) tracks environment verification. The authenticated portal at `localhost:3202` calls the API at `localhost:8080`. That process uses the hosted Supabase project through the `rental_app` database role. Before the migration, the database lacked `marketing_media`, `marketing_drafts` and `marketing_draft_media`. The API mapped the missing tables to `503 MARKETING_UNAVAILABLE`. All three representation columns referenced by the foundation migration were present.

With hosted database approval, applied only `20261031215333_agent_marketing_foundation.sql` and recorded it in migration history in the same transaction. Verified row-level security and the Agent policy on each of the three tables, no direct access for the anonymous or authenticated client roles, and the private `marketing-media` bucket.

The signed-in Agent Overview loaded in the browser after retry. The hosted application role saved and read a test draft, an unrelated actor could not read it, and a rollback removed the test row. Ten focused API integration tests passed against isolated PostgreSQL. The browser CRUD suite passed with synthetic API responses. Upload through hosted Storage still needs `SUPABASE_SERVICE_KEY` on the backend and a live check. Facebook connection has a separate release path.

## Facebook route recovery and acceptance

Owner Web calls `GET /agent/marketing/channels/facebook` on `http://localhost:8080`. The NestJS Marketing module already registers this route with no global prefix. The local process predated the compiled route and returned `404`. After rebuilding and restarting, the same request and `POST /agent/marketing/channels/facebook/start` returned `401` without credentials. The signed-in Agent Channels tab loaded the real API status and showed that Meta is unavailable in this environment. For ongoing local development, run the API in watch mode or rebuild and restart after route changes.

The status UI distinguishes a backend without the route from a configured API with Facebook disabled. An expired or revoked authorization during the OAuth exchange gives the Agent a reconnect action. A stored Page displays its connection date. Ongoing token health and publishing remain unavailable.

API build, typecheck, lint and 711 tests passed with disposable PostgreSQL. Owner Web typecheck, lint and 98 tests passed. The focused Chromium run with intercepted provider and API responses verified route retry, the real Next.js callback redirect, expired authorization recovery, Page selection, persistence across refresh and disconnect. Run it with `node apps/owner-web/__tests__/marketing.browser.mjs --facebook-only` while Owner Web is running. The full Marketing browser run timed out waiting for the Reel preview. Neither run verifies live Meta consent or Page discovery.

Render returned `200` for health and `404` for both Marketing and Facebook channel status. The Vercel callback also returned `404`. The local API has no Meta credentials and its configured hosted Supabase database lacks the three Facebook connection tables. For a live test, first provision an approved test database or apply `20261104084504_facebook_page_connections.sql` to the approved environment, release the API and callback together, set the Meta secrets on the API, then use an app-role tester and an authorized test Page. Live OAuth and private Reel verification remain open. No release or Facebook post was made during this check.
