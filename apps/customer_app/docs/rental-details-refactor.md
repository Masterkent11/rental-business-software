# Rental listing and application update — 21 October 2026

## Result

Rental details use a full-width swipeable hero, white circular controls, photo count, rounded transition, title/location, compact real property facts, real feature chips and underline tabs. The description expands in place. Each tab remembers its scroll offset. Missing photos use the existing AppImage fallback; missing ratings no longer produce invented ratings or review authors.

The only displayed rental price is in `RentalActionBar`, beside one primary action. Monthly listings show a monthly rate, “Long-term rental” and “Apply to rent”. Short stays show a nightly rate, “Select dates” and “Reserve”. Selecting dates reuses `BookingDatesScreen` in a sheet; the selected backend quote supplies the total and night count. Loading, unavailable and failed quotes cannot reserve. Fee breakdown remains in checkout; checkout no longer repeats its total above the payment action. Monthly listings no longer open the nightly date selector from Overview.

Rental listings have no Message action. Backend conversation creation and outgoing messages require an owned confirmed booking/lease or an actually submitted application. An unpaid hold or draft is insufficient. Existing conversation records remain intact. Previously confirmed stays and submitted applications keep communication after cancellation or withdrawal. Existing sale inquiry rules remain separate.

The underlying duplicate UI came from a standalone price Text below the location, MoveInCostCard in Overview, an unconditional CheckDatesButton and the Message/action footer. The footer now owns pricing; move-in breakdown belongs to application review. Face alignment/right/left/up screens no longer contain the stage progress bar. Real OCR/network processing states remain.

## Application policy and identity

The existing three steps remain. The supplied consolidation request adds requested lease duration and actual listing requirements to Step 1. Optional `minLeaseMonths`/`maxLeaseMonths` come from listing configuration, not a universal minimum; maximum occupants and rental mode are checked on the backend during draft save and submission. Owner listing create/update APIs accept the policy fields. Existing listings retain unrestricted duration within the existing 1–60 month application bounds, and pending-identity submission defaults to false.

ML Kit continues to provide OCR and facial guidance only. Complete captures enter MANUAL_REVIEW. Platform reviewers can inspect short-lived private evidence and issue an explicit, version-bound decision with a validity date. Renters and owners cannot approve identity. Approval metadata survives private-evidence cleanup; a valid approval can be reused by its owner without another scan. Expired approvals cannot be reused or submitted. Pending submissions require an explicit per-listing policy and still cannot receive owner approval before identity is verified. Notifications and final submission remain transactional and idempotent; verification never auto-submits an application.

## Changed files

Customer presentation and data:

- `lib/features/listing/listing_detail_screen.dart`
- `lib/features/listing/widgets/listing_attributes.dart`
- `lib/features/listing/widgets/rental_action_bar.dart` (new)
- `lib/features/booking/booking_dates_screen.dart`, `booking_checkout_screen.dart`
- `lib/features/application/application_controller.dart`, `application_details_view.dart`, `application_flow_view.dart`, `apply_screen.dart`, `domain/verification.dart`, `verification_camera_view.dart`, `verification_panel.dart`
- `lib/data/listing_repository.dart`, `lib/fixtures/view_models.dart`
- `test/rental_action_bar_test.dart` (new), `customer_app_test.dart`, `verification_flow_test.dart`, `verification_widget_test.dart`, `application_reference_layout_test.dart`

API:

- Messaging start/send use cases, messaging repository port, domain rules and Postgres repository.
- Listing create/update use cases, repository port, domain types/rules, owner controller/DTO, HTTP mapper and Postgres repository.
- Verification domain/provider port, status use case, storage port, Postgres verification/application repositories, private Storage adapter, DTO/controller/tokens/module.
- New manual-review adapter, evidence-review and identity-decision use cases, and rental-application-policy repository helper.
- New policy domain/integration tests, storage signing tests, and expanded messaging/verification tests.
- `apps/api/docs/identity-verification.md`.
- `supabase/migrations/20261021110318_rental_application_policy.sql` (new).

The earlier iOS simulator repair and pre-existing staged changes are separate from this update. No commit or push was made.

## Validation

The new migration was tested against isolated PostgreSQL on port 55439, then applied atomically to the existing linked development project with its migration history recorded. Public listing and detail requests return HTTP 200; unauthenticated identity-review access returns HTTP 401. The linked security advisor reported no error-level findings.

| Check | Result |
| --- | --- |
| Flutter regression tests | 304 passed |
| Flutter analysis: lib, test, integration_test, test_driver | No issues |
| Dart formatting for 19 changed source/test files | No changes required |
| API typecheck, lint and build | Passed |
| API full suite against isolated PostgreSQL | 498 passed; 1 pre-existing Matterport externalModelId failure |
| New rental-policy integration tests | 5 passed, including historical communication and unpaid-hold denial |
| iOS Simulator debug build | Passed, 58.7 seconds |
| Normal customer app simulator launch and hot restart | Passed |
| Diff whitespace check | Passed |

Tests cover quote totals including fees, quote failures/retry, monthly CTA, compact real facts, narrow screens/large text, manual-review success gating, configured pending submission, role checks, replay/stale decisions, private URL ownership/expiry, duration/occupancy policy, verification expiry/reuse/isolation, duplicate submission, approval prerequisites and historical messaging. Existing regression tests continue to cover front-only capture, OCR parsing, Step 1 initialization/errors, session resume, explicit submission, booking/payment flow and architectural boundaries.

The Matterport failure is the previously reproduced baseline failure in `partner-marketplace.integration.test.ts:670`; no tour pipeline implementation was changed in this task.

## Remaining limits

- `SUPABASE_SERVICE_KEY` is absent from the current backend environment, so private live identity uploads and a real capture-to-review run remain blocked. No live identity was approved or application submitted during this update.
- Automated document authenticity, face matching and spoof-resistant liveness are not implemented. The current production route is explicit platform manual review, not simulated verification success.
- Manual identity-review endpoints are implemented; a dedicated reviewer console and owner-web policy controls were not added. Listing policy can be set through the existing authenticated owner listing APIs. Existing listings default to requiring verified identity before submission.
- Review evidence retains the existing thirty-minute retention window. A reviewer must inspect it before expiration; minimal approval metadata remains as an audit record and authorizes reuse only before its explicit validity date. The cleanup keeps minimal consent/decision audit metadata and deletes identity fields/images.
- The rendered layout preview used test listing data and a temporary local system font load. It was not a physical-device camera or biometric evaluation; no reference people, IDs, screenshot frames or fixture photos were added to production assets.

