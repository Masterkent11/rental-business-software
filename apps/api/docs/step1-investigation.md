# Rental application Step 1 investigation — 21 October 2026

The Step 1 server failure was caused by an unapplied identity-verification database migration. The running API was using the configured Supabase transaction pooler successfully, but its database did not contain `application_drafts` or `identity_verification_sessions`.

## Reproduction and evidence

Requests were made against the running development API on port 8080 using the existing signed-in development session. Tokens and customer identity fields were not logged.

```text
GET /me                                      200
GET /application-drafts/resource/:resourceId 500 INTERNAL
POST /application-drafts                     500 INTERNAL
Postgres SQLSTATE                            42P01
PostgresError: relation "application_drafts" does not exist
```

The draft repository reproduced the failing database call with this stack excerpt:

```text
PostgresError: relation "application_drafts" does not exist
  at ErrorResponse (node_modules/postgres/src/connection.js:815:30)
  at handle (node_modules/postgres/src/connection.js:489:6)
  at Socket.data (node_modules/postgres/src/connection.js:324:9)
  at sql (node_modules/postgres/src/index.js:112:11)
  at src/infrastructure/postgres/repositories/postgres-verification.repository.ts:50:29
```

A direct query using the configured `rental_app` connection succeeded, while `to_regclass` returned null for both required tables. Authentication and API routing were working: `/me` returned 200, invalid request bodies returned 400, and invalid bearer tokens returned 401. No pooler connection failure was reproduced during this investigation.

The initial lookup restores an existing draft; it does not submit an application. Continue saves the draft and creates or resumes its verification session. The final `POST /applications` remains a separate action from Step 3.

## Fix

Applied the existing `20261020174429_application_identity_verification.sql` migration to the linked Supabase project after confirming it matched the API's configured project. The migration and its history entry were applied in one transaction. The pre-existing remote migration history includes versions absent from this checkout, so a general `db push --dry-run` refused to proceed. Those other history entries were preserved; only this migration was deployed. Future general migration pushes still require reconciling that existing history difference.

After deployment, the same live draft lookup returned:

```text
GET /application-drafts/resource/:resourceId 200 {"draft":null}
```

All four new tables have RLS enabled. Neither `anon` nor `authenticated` has table privileges on them. The security advisor reported no findings concerning the verification tables.

The unwanted bar came from `if (flow.busy) const LinearProgressIndicator()` in the shared application layout. Any Continue operation displayed it below the stepper. Removed that widget, removed the rental-term/message controls and explanatory paragraph from Step 1, and separated background draft restoration from action busy state. The form remains visible during restoration, and late results cannot overwrite entered values. The outlined date and occupant controls, property card, connected stepper, centered title, and bottom Continue follow the approved layout. Actual errors use neutral text; restoration failures expose a retry action, and Continue failures can be retried through Continue.

OCR confirmation automatically starts the face challenge. A backend `VERIFIED` response automatically advances to Review. Consent remains in Step 2. Neither transition submits an application. Student ID parsing and camera guidance were added alongside the existing supported document types.

Client errors distinguish connection failures, timeouts, expired authentication, server errors, and verification errors. Both response headers and response-body consumption share the request timeout. Known database connection and availability failures map to HTTP 503 without exposing driver details; missing-schema/programming failures remain generic HTTP 500.

## Files changed for this fix

Under `apps/customer_app/`:

- `lib/features/application/apply_screen.dart`
- `lib/features/application/application_flow_view.dart`
- `lib/features/application/application_details_view.dart` (new)
- `lib/features/application/application_property_summary.dart`
- `lib/features/application/application_controller.dart`
- `lib/features/application/verification_panel.dart`
- `lib/features/application/domain/id_ocr_parser.dart`
- `lib/data/device_verification_camera.dart`
- `lib/data/api_client.dart`
- `test/verification_flow_test.dart`
- `test/verification_widget_test.dart`
- `test/verification_domain_test.dart`
- `test/customer_app_test.dart`
- `test/api_client_errors_test.dart` (new)

Under `apps/api/`:

- `src/modules/shared/http-exception.filter.ts`
- `src/modules/shared/__tests__/http-exception.filter.test.ts` (new)
- `docs/identity-verification.md`
- `docs/step1-investigation.md` (this report)

The existing migration was deployed without changing its SQL. Earlier verification implementation files and unrelated working-tree changes were preserved.

## Validation

The isolated HTTP smoke test used the real application, real JWT validation, and an isolated migrated PostgreSQL database on port 55439. No identity images were uploaded and no final application was created by this smoke test.

```text
POST /application-drafts                     201
POST /application-drafts (repeat)            201 — same draft
GET /application-drafts/resource/:resourceId 200 — saved values restored
POST /identity-verifications                 201 — CONSENT_REQUIRED
POST /identity-verifications (repeat)        201 — same session
POST /applications without verified identity 409
GET draft with PostgreSQL unreachable        503 SERVICE_UNAVAILABLE
```

For the unavailable-database check, a separate API process pointed to a closed local PostgreSQL port. The active development database was not stopped. Its log contained only `Request dependency unavailable (ECONNREFUSED)` for that request failure.

Regression coverage includes invalid dates and occupant bounds, duplicate Continue taps, form retention after network/timeout/auth/server failures, verification initialization failure and retry, draft restoration failure and retry, late restoration, automatic face-challenge initialization, backend-authorized Review navigation, explicit submission, expiry revalidation, duplicate final submission, unauthorized session access, RLS, and minimal Step 1 while Continue is busy. Successful KYC transitions in tests use test-only authoritative responses; they do not establish live biometric verification.

- Flutter: **290 tests passed** with `flutter test --reporter expanded`.
- Flutter static analysis: **no issues** over `lib`, `test`, `integration_test`, and `test_driver`.
- Dart format check: **14 files checked, no changes**.
- API focused verification, submission, reservation, error-handling, and architecture tests: **83 passed** across 14 test files against isolated PostgreSQL.
- API full suite: **476 passed, one failed**. The failure is the previously reproduced, unrelated Matterport `externalModelId` assertion at `partner-marketplace.integration.test.ts:670`.
- API typecheck, ESLint, build, and `git diff --check`: **passed**.
- Live development draft lookup after migration and isolated HTTP smoke checks: **passed**.
- Flutter layout rendered and visually inspected at iPhone width; busy-state and small-screen/large-text regressions passed.
- No new physical-device camera run was necessary for these UI/controller changes. The earlier native smoke test is documented in `identity-verification.md`.

Local evidence logs: `/private/tmp/wsp-step1-root-cause.log`, `/private/tmp/wsp-step1-http-results.log`, `/private/tmp/wsp-step1-api.log`, `/private/tmp/wsp-step1-api-focused.log`, `/private/tmp/wsp-step1-flutter-final.log`, and `/private/tmp/wsp-step1-analyze-final.log`. A Flutter-rendered layout preview is at `/private/tmp/wsp-step1-preview.png`; its property thumbnail uses the normal missing-image fallback.

## Remaining blockers

Step 1 and verification-session initialization are unblocked. Live KYC completion remains blocked by the pre-existing unavailable server liveness/face-matching adapter. ML Kit OCR and face detection cannot establish a trusted identity or spoof-resistant liveness result. Private evidence upload also requires the existing server-only `SUPABASE_SERVICE_KEY`, which was absent from the inspected environment configuration. No fake successful decision or production mock adapter was added. Final submission continues to require a valid, owned server verification.
