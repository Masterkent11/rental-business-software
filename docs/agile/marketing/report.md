# Agent Marketing Hub delivery report

Recorded 2026 11 01, Asia/Manila. Local branch `codex/agent-marketing-phase-one` preserves the prior uncommitted authentication work. User authorized Phase 0 followed by the internal Phase 1 foundation. No commit, push, merge, deployment, provider connection or remote migration.

PHASE 0: DOCUMENTED

PHASE 1: IN REVIEW

PHASE 2 TO 4: NOT AUTHORIZED

## Part A: Agile governance

All repository issues were searched for Marketing Hub, content library and social publishing equivalents. No duplicate scope was found. Reviewed #12, #17, #56/#57/#58, #62/#63/#64, #86/#87/#88, #103, #107, #112 and #113. Their historical descriptions and completed evidence are preserved. Existing coordination, representation, dashboard, Storybook and auth records received only dependency/change appendices where applicable; their project statuses and unrelated fields were not altered.

Created [Marketing epic #114](https://github.com/Masterkent11/rental-business-software/issues/114) under platform initiative #12, twelve stories and twelve scoped delivery tasks. Parent relationships and existing Project 3 metadata were published and verified before product implementation. Stories include actual requirements, architectural subtasks, numbered acceptance criteria, manual walkthroughs, positive/negative scope tests, documentation and acceptance gates. No empty task placeholders, fabricated assignees, dates, estimates or iteration assignment.

The Phase 2 Meta stories depend on the Phase 1 draft/security contracts and OAuth work; they do not require the later Phase 3 scheduling engine for an initial confirmed direct publication. This dependency clarification is captured in the final ticket appendices. Future stories remain blocked on new phase authorization and official provider reviews.

Edited existing issues, with appendices only: [#17](https://github.com/Masterkent11/rental-business-software/issues/17), [#56](https://github.com/Masterkent11/rental-business-software/issues/56), [#58](https://github.com/Masterkent11/rental-business-software/issues/58), [#62](https://github.com/Masterkent11/rental-business-software/issues/62), [#64](https://github.com/Masterkent11/rental-business-software/issues/64), [#86](https://github.com/Masterkent11/rental-business-software/issues/86), [#103](https://github.com/Masterkent11/rental-business-software/issues/103), [#107](https://github.com/Masterkent11/rental-business-software/issues/107), [#112](https://github.com/Masterkent11/rental-business-software/issues/112), [#113](https://github.com/Masterkent11/rental-business-software/issues/113). Their Project fields remain unchanged. The #58 and #64 clarification appendices were added during final review; the Phase 0 snapshot retains the original before code record.

Exact links and final statuses: [mapping](github-mapping.json). Dependencies: [dependency matrix](dependencies.json). Existing work stays separate: role intent issue #113, Owner provisioning #112, representation #56/#57/#58, dashboard #62/#63/#64 and Storybook #86/#87/#88. None of those capabilities was rebuilt, automatically completed or reassigned.

## Part B: Architecture and security

Reused the role aware navigation factory, shared OwnerShell/RouteGuard and workspace switcher, real session identity, existing Page/TopBar/form/button/photo primitives, HttpClient, FileReader adapter, and scoped Zustand conventions. Marketing appears only as one Agent sidebar destination under Marketing. All six Hub sections are internal navigation; Owner sidebar is unchanged. Agent Profile is distinctly labeled.

NestJS adds a Marketing module with DTO/mapping boundaries, separate use cases for overview, save/get/remove/duplicate draft and upload/read/remove media. Repository and processor ports keep PostgreSQL, Sharp and Storage out of application/domain. Authorization reuses actual Agent profile/capabilities and the existing representation ListingGate. Eligible property reads are bounded in batches rather than repeatedly loading the Agent for every property. The existing Supabase MediaStorage factory gained opt in private bucket reads and 15 second storage timeouts; tour storage retains its defaults and has regression coverage.

New local migration: `supabase/migrations/20261031215333_agent_marketing_foundation.sql`. Tables: marketing_media, marketing_drafts and ordered marketing_draft_media. Actor RLS, same actor composite FKs, minimum table grants and a private marketing-media bucket are defined. A security invoker property predicate enforces current active representation, verified/public Agent, editing permission and authorized source photo URLs on writes. No anonymous browser table rights, security definer escalation or social credential store. Revoked source media is hidden and listed as action required; users can detach the property before saving again.

Private library: JPEG/PNG/WebP input up to 8 MiB, normalized JPEG with orientation applied and metadata removed, capped at 20M decoded pixels and 4096px output; MP4 up to 12 MiB with bounded container validation, no transcoding/codec/duration eligibility claim. Two simultaneous processor operations are allowed; excess processing is refused without an unbounded queue. File quotas: 100 assets, 256 MiB, ten reservations per minute per Agent; unresolved pending/failed records count. Signed read URLs expire after 120 seconds. Referenced objects cannot be removed. Failed upload never becomes READY and remains visible for cleanup/retry. Storage deletion failure retains FAILED metadata, preserving bounded accounting.

Drafts: max 200 per Agent, title 120/caption 2200 characters, up to 10 owned READY media/source photos, optimistic versions, duplicate as DRAFT, explicit delete and retrieval. Phase 1 accepts only DRAFT or READY_FOR_REVIEW. Readiness requires caption and media; it does not publish. Full future content/delivery lifecycle is documented separately from provider outcomes. A connection cannot confer property representation or control of Owner channels.

Official provider feasibility and sources are in [feasibility](feasibility.md). Meta guides returned HTTP 429; exact Graph version/scopes require verification before implementation. The official Meta Instagram collection documents professional account contracts; TikTok documentation confirms audit/consent/creator and visibility restrictions. No app/business review or posting permission is claimed approved. Existing infrastructure and installed Sharp are reused without a package/lockfile change or paid service provisioning. Quotas bound usage, but storage/egress are not promised free.

## Part C: Phase 1 implementation and evidence

Route: `/agent/marketing`; internal views: Overview, Posts & Reels, Media Library, Publishing Calendar, Connected Channels and Performance. The UI exposes actual draft/library counts and backend persisted CRUD, authorized property/photo selection, captions, media preview and upload/delete states. Channels and performance are honest availability states with no fake Connect, Publish, Schedule or metrics controls. Calendar shows draft activity clearly distinguished from publication scheduling.

API: GET `/agent/marketing`; GET/POST `/agent/marketing/drafts`; GET/PUT/DELETE `/agent/marketing/drafts/:id`; POST `/agent/marketing/drafts/:id/duplicate`; GET/POST `/agent/marketing/media`; GET `/agent/marketing/media/:id/read`; DELETE `/agent/marketing/media/:id`. Request identity is derived on the server; DTOs reject caller supplied actor/role and publishing state. No schema produces a safe 503 marketing availability response, rather than fake successful empty data.

Store scope is tied to user plus actual Agent workspace and clears on logout/account/workspace change. Epoch and request sequence checks discard late responses; failed upload refreshes metadata so FAILED is not mistaken for success. Explicit workspace selection remains required for users with multiple roles. No new competing auth session or Agent account implementation.

| Verification | Actual result |
| --- | --- |
| Frontend typecheck and ESLint | Passed |
| Frontend unit and architecture tests | 77 passed, zero skipped |
| Frontend production build | Passed, /agent/marketing included |
| API typecheck, ESLint and build | Passed |
| Focused marketing/domain/processor/real DB/storage/error tests | 35 passed in five files |
| Additional shared storage and API architecture checks | 30 passed in two files; overlaps storage tests above |
| Broad disposable PostgreSQL API suite | 638 passed, one existing invoice collection failure |
| Auth regression browser suite | Passed; eight required auth screenshots plus both role flows |
| Marketing production build browser checks | CRUD, persistence through reload, duplicate/edit/delete, referenced media refusal, error recovery, future availability, Owner route denial and explicit dual workspace switching passed |
| Marketing captures | Overview/editor at 375x812,834x1112,1440x900,1920x1080 |
| Live local API discovery | /health returned 200; unauthenticated /agent/marketing returned 401 |
| Remote migrations and external publishing | Not performed |

The broad suite's existing failure is `invoices.integration.test.ts:161`: claimedCentavos expected 1000000 but returned 0. It had already reproduced before Marketing Hub without the Owner onboarding migration. Finance implementation/tests are untouched. The full API suite is not claimed green; final focused checks cover the current marketing changes. No CI/PR/reviewer acceptance is fabricated.

Browser requests use intercepted synthetic provider/API fixtures. Actual PostgreSQL persistence/RLS is separately exercised against disposable local clusters. Storage is checked through its port and mocked Supabase HTTP contract, not by uploading to a hosted bucket. No live Agent/Owner account or remote storage object was created for QA. Screenshots are real browser captures of the implemented UI using those fixtures, not production publication evidence.

Screenshots and results: [Overview laptop](screenshots/overview-1440x900.png), [Overview mobile](screenshots/overview-375x812.png), [Editor mobile](screenshots/editor-375x812.png), [Editor desktop](screenshots/editor-1920x1080.png), [Browser results](screenshots/results.json). Exact production/shared/test paths: [Changed files](changed-files.json). No code comments were added to new marketing files.

## Part D: Next phase readiness and remaining gates

Configured remote database and bucket are intentionally unchanged. This environment needs explicit review/application of the marketing migration before actual marketing CRUD/uploads can work there. No bypass or temporary public storage fallback was added. Rollback starts by disabling the new routes; preserve/export drafts and object references before any reviewed schema/bucket removal. Never drop existing auth/Agent data or delete owned content automatically.

Next authorized review: #117 navigation, #119 private media, #121 drafts and #135 security. Then real configured environment acceptance and #137 QA. Storybook foundation #86/#87/#88 is still absent and was not replaced; auth enrollment #113 and Owner provisioning #112 remain separate dependencies. Native screen reader, broader media codec playback and final design/security acceptance are not claimed complete. Internal code is In Review, not production ready.

Before Phase 2: choose supported Meta login model, verify official guide/version/scopes, register/own the app, obtain business/app review and permitted Page/professional account access, approve credential encryption/CSRF/disconnect/delegation design, and run provider sandbox consent/publication confirmation tests. Explicit new authorization is required.

Before Phase 3: obtain TikTok app/scope/audit eligibility, implement creator consent and separate inbox handoff from confirmed publishing, approve worker hosting/costs, idempotency and scheduling/timezone behavior. Phase 4 MCP remains optional and may never expose credentials or bypass publishing approval. No unsupported engineering estimate or delivery date is invented.
