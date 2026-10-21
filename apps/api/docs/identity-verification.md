# Customer application identity verification

## Current implementation

The Flutter app uses its own camera screens with Google ML Kit text recognition and face detection. It scans the ID front only, collects reviewed OCR fields, and captures alignment, right, left, and upward poses under a server challenge. No Sumsub integration or credentials are used.

ML Kit text and pose outputs are untrusted capture guidance. Face detection is not facial recognition or spoof-resistant liveness. The production composition root routes a complete capture to `MANUAL_REVIEW` through `manualReviewVerificationProvider`; it never auto-approves a person. **Automated document authenticity, facial matching and spoof-resistant liveness remain unimplemented.**

A platform administrator may inspect short-lived private evidence URLs and explicitly approve or reject an unchanged pending capture. Approval requires a future `validUntil`, records reviewer ID and decision time, and is checked server-side. Owners and renters cannot perform identity review. A reviewed identity can be reused for the same authenticated user until its stated validity expires; reuse copies only consent and decision metadata into a new draft session. Raw evidence and ID fields retain the existing thirty-minute cleanup schedule. No client OCR or head movement can create an approval.

By default an application still requires verified identity. A listing owner may explicitly configure `allowPendingIdentityApplication` to accept submission while identity is in manual review. That policy never permits owner approval or a lease hold before identity passes review. Submitted drafts remain immutable except for the authorized identity review decision. There is no automatic application submission.

A future automated implementation of `VerificationProvider.verify` must verify document authenticity, facial match, liveness, evidence provenance, challenge binding and expiry. A completed photo sequence alone is insufficient. Current tests do not validate biometric accuracy or anti-spoofing.

## Reference layout

The front-ID scanner uses a full-screen live camera with white/blue corner guides, a rounded white instruction sheet, blue checklist icons, and a circular shutter. Automatic capture remains enabled. OCR processing keeps the captured surface dimmed, shows a real activity spinner and processing sheet, and only marks text extraction complete after ML Kit returns. There is no back-ID screen or back-image request.

Identity review displays the user's captured ID from temporary memory, four compact editable fields, and a bottom Continue action. The image is cleared from flow state after confirmation or exit and evicted from the image cache when the preview closes. Face screens use the live front camera, the supplied alignment/arrow assets, without loading/progress bars during face guidance. A backend `VERIFIED` result starts the completion animation; animation completion opens application review. The animation never sets or infers verification status.

The 390×844 layout tests use a camera-platform test harness, not sample people, IDs, or reference screenshots in production. Native camera frames and property data remain dynamic.

## Setup

Apply `supabase/migrations/20261020174429_application_identity_verification.sql` and `supabase/migrations/20261021110318_rental_application_policy.sql` with the project's migration workflow. The migration preserves submitted applications and introduces user-scoped drafts, verification sessions, capture limits, a private `identity-evidence` bucket, and an expiring upload ledger. Do not grant Data API access to the new tables or direct client access to the bucket.

The existing `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` server configuration is required for private evidence upload and deletion. The service key must never be placed in Flutter configuration. No new provider secrets are configured. ML Kit Latin recognition and face models run on device through pinned Flutter plugins. iOS requires 15.5 or newer; Android Java compatibility is 11. Run `flutter pub get` and install the iOS pods after updating.

## API

- `GET /application-drafts/resource/:resourceId`: recover the current user's draft or persisted submission.
- `POST /application-drafts`: validate and save resource, move-in date, term, occupants, and message.
- `POST /identity-verifications`: create/resume an owned draft session.
- `POST /identity-verifications/:id/consent`: accept `identity-v1` explicitly.
- `POST /identity-verifications/:id/front`: upload JPEG/PNG front evidence and ML Kit transcription; no back field is accepted.
- `POST /identity-verifications/:id/details`: validate reviewed fields, without establishing identity.
- `POST /identity-verifications/:id/challenge`: issue/resume a three-minute server challenge.
- `POST /identity-verifications/:id/face`: upload the current pose under that challenge and an evidence request UUID.
- `GET /identity-verifications/:id`: reconcile authoritative status. Complete captures move from VERIFYING to MANUAL_REVIEW with the current manual-review adapter. Transport or storage failures remain recoverable errors.
- `POST /identity-verifications/:id/cancel`: invalidate the session and clear identity fields.
- `GET /admin/identity-verifications/:userId/:id/evidence`: platform-reviewer-only access to pending details and signed evidence URLs, lasting at most sixty seconds. Response is `no-store`.
- `POST /admin/identity-verifications/:userId/:id/decision`: platform-reviewer-only decision with `version`, `approved`, `evidenceReviewed: true` and `validUntil` (future ISO timestamp for approval; null for rejection). Stale, expired or repeated decisions are rejected.
- `POST /applications`: existing submission endpoint now requires `draftId` and matching reviewed application inputs. It locks the draft and verification, rechecks ownership and validity, creates one application, links the draft, and inserts the existing APPLICATION_RECEIVED notification in the same transaction. Retrying the same submitted draft returns its persisted application.

Raw images and storage paths never appear in owner-facing responses. OCR confidence is optional, comes from ML Kit when available, and is not proof of identity. Camera evidence is bounded to 8 MB and 24 million decoded pixels; the server decodes and strips metadata. Capture writes are limited to ten per user per minute.

## Recovery and retention

Draft recovery uses the authenticated backend, not local storage of identity data. Captured temporary camera files are deleted after analysis. The app disposes cameras and detectors and reconciles status on resume. A cancelled, expired, or recaptured session cannot satisfy submission. Editing confirmed identity details requires recapture; application dates and occupants remain editable. Existing draft term/message values are retained, and all submitted values are checked again during submission. Step 1 displays only the property summary, date, occupants, and Continue. OCR confirmation starts the face challenge automatically, and an authoritative verified response advances to Step 3 without submitting.

Sessions expire after 30 minutes, and a scheduled cleanup runs every minute using the existing interval scheduler. It clears expired identity fields while preserving consent version/time, and deletes tracked evidence from private storage. Uploads are tracked before storage writes so failed or orphaned writes are also eligible for expiry cleanup. Superseded captures are removed immediately when possible, otherwise by the same job. Cleanup failures log a generic retry message without PII. Identity metadata is unavailable to unauthenticated, cross-user, and owner-scoped queries. Provider-independent consent records must be considered alongside the project's privacy policy before a real biometric engine is enabled; no biometric retention policy is implied by a model's defaults.

## Validation

Use the existing API typecheck, lint, build, and test commands. Database tests require a local PostgreSQL instance and TEST_ADMIN_DATABASE_URL. `verification.integration.test.ts` validates real RLS, duplicate submission, transaction notification timing, expiry, stale writes, and cleanup metadata. Its storage HTTP requests are mocked, not a live Supabase Storage test.

Flutter verification tests cover OCR parsing and uncertain fields, mirrored face guidance, form validation, draft retention, explicit review and submission, repeat taps, disposal, consent, backend success gating, and a small viewport with large text. A native build and physical device run are still required to validate camera permissions, image orientation, plugin interoperability, lighting, and actual ML Kit inference. No mock or unit test establishes biometric validity.

## Executed device check

On 21 October 2026, the physical iPhone smoke test passed with `flutter drive --driver=test_driver/verification_driver.dart --target=integration_test/verification_camera_test.dart -d <device-id> --publish-port --no-uninstall-first`. Both rear and front cameras were initialized; native ML Kit text recognition and face detection processed real camera captures. Temporary images were deleted without upload. This is a camera/plugin smoke test, not evidence of OCR field accuracy, head-pose accuracy, face matching, or spoof-resistant liveness. The unsigned iOS release build also passed.

## Check results

- Flutter regression suite after the reference layout update: 297 tests passed.
- Flutter analysis over lib, test, integration_test, and test_driver: no issues.
- API focused verification, applications, reservations, error handling, and architecture checks: 83 tests passed against isolated PostgreSQL in the Step 1 correction run.
- API full regression run: 476 passed, one pre-existing failure in `partner-marketplace.integration.test.ts` (Matterport externalModelId), reproduced with the unchanged HEAD API source in an isolated baseline checkout.
- API typecheck, lint, build, Dart formatting, and diff whitespace checks passed.
- Android build could not run because no Android SDK is installed.
- Apple Silicon simulator support uses the pinned upstream compatibility helper described in the customer app iOS simulator build report. Native simulator OCR/face inference passed; physical-camera checks remain distinct.
- No live Supabase Storage or real server face-matching/anti-spoofing integration test was run.

The Step 1 API failure investigation, deployed migration, request traces, changed files, and current blockers are recorded in [step1-investigation.md](step1-investigation.md).

The reference layout update also passed 28 focused layout/flow tests and static analysis. The unsigned iOS device build compiled successfully. Local rendered previews use a camera test harness; they are not physical-device screenshots.

## Rental-details consolidation checks

The 21 October consolidation passed 304 Flutter tests, static analysis, API typecheck/lint/build, and the iOS Simulator debug build. The API suite passed 498 tests with the same pre-existing Matterport externalModelId failure. New policy tests include expired approval metadata while a capture session is still otherwise live, own-user reuse after evidence cleanup, configured pending submission, owner approval gating, historical messaging and denial of unpaid booking holds.

The policy migration is applied to the existing linked development backend. The current environment still lacks `SUPABASE_SERVICE_KEY`; live private capture/upload and reviewer approval were not exercised. There is no reviewer console or owner-web policy editor in this change. Full file and check details are in `apps/customer_app/docs/rental-details-refactor.md`.
