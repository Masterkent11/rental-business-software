# File inspection ledger

Eligible: 1081. Detailed content reviews: 221. Coverage: 20.44%. Every eligible file was read by the inventory scanner; static scanning is explicitly **not** a complete architecture/security review.

Scope includes first-party source, tests, configuration, migrations, and documentation in the three requested applications, Supabase, root docs/scripts/CI. Excludes dependencies/build outputs, lockfile contents, generated registrants/config, and asset packs. Dependency manifests and authored native build setup are included. reviewed-files.json binds detailed reviews to content hashes; edits invalidate reviews until renewed.

| Path | Application | Layer | Inspection | Findings | Severity | Refactor required | Tests |
|---|---|---|---|---:|---|---|---|
| .github/workflows/quality.yml | .github | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| .gitignore | .gitignore | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| DEMO.md | DEMO.md | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| LAUNCH_READINESS.md | LAUNCH_READINESS.md | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| README.md | README.md | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/.env.example | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/.gitignore | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/AGENTS.md | api | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/docs/README.md | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/docs/architecture/development-workflow.md | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/docs/architecture/folder-structure.md | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/docs/architecture/master-plan.md | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/docs/architecture/naming-conventions.md | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/docs/architecture/patterns.md | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/docs/architecture/testing-governance.md | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/docs/identity-verification.md | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/docs/step1-investigation.md | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/eslint.config.mjs | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/package.json | api | configuration/documentation | Reviewed | 1 | High | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/api/scripts/contracts/generate.mts | api | configuration/documentation | Reviewed | 1 | Medium | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/api/scripts/contracts/run.mts | api | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/scripts/contracts/validate.mts | api | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/scripts/demo/floor-plan.mts | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/scripts/demo/perspective.mjs | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/scripts/demo/seed-demo-media.mts | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/scripts/fake-idp.mjs | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/scripts/make-panorama.mjs | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/scripts/make-room.mjs | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/scripts/panorama-budget.mjs | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/scripts/test-db.sh | api | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/scripts/test-isolated-db.sh | api | configuration/documentation | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/__tests__/architecture.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/app.module.ts | api | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/application/agents/agent-dashboard/agent-dashboard.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/agents/list-agent-clients/list-agent-clients.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/agents/manage-agent-profile/manage-agent-profile.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/agents/manage-agent-tasks/manage-agent-tasks.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/agents/manage-representation/manage-representation.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/agents/partner-analytics/partner-analytics.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/agents/review-agent-verification/review-agent-verification.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/agents/search-agents/search-agents.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/agents/view-public-agent/view-public-agent.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/applications/attach-application-document/attach-application-document.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/applications/decide-application/decide-application.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/applications/get-my-application/get-my-application.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/applications/get-my-applications/get-my-applications.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/applications/list-organization-applications/list-organization-applications.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/applications/reserve-application/reserve-application.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/applications/submit-application/submit-application.use-case.ts | api | application | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/application/applications/withdraw-application/withdraw-application.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/assignment/assign-lead/assign-lead.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/assignment/assignable-listing.rules.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/assignment/assignment.types.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/assignment/issue-referral-code/issue-referral-code.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/assignment/reassign-lead/reassign-lead.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/assignment/resolve-lead-assignment/resolve-lead-assignment.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/assignment/sweep-lead-assignments/sweep-lead-assignments.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/bookings/create-booking/create-booking.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/bookings/get-my-booking/get-my-booking.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/bookings/get-organization-booking/get-organization-booking.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/bookings/list-my-bookings/list-my-bookings.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/bookings/list-organization-bookings/list-organization-bookings.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/bookings/manage-availability-blocks/manage-availability-blocks.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/bookings/place-hold/__tests__/place-hold.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/bookings/place-hold/place-hold.types.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/bookings/place-hold/place-hold.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/bookings/update-booking-status/update-booking-status.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/bookings/view-availability/view-availability.types.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/bookings/view-availability/view-availability.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/collection/apply-payment-to-invoice/apply-payment-to-invoice.types.ts | api | application | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/collection/apply-payment-to-invoice/apply-payment-to-invoice.use-case.ts | api | application | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/application/collection/get-owner-collection/__tests__/get-owner-collection.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/collection/get-owner-collection/get-owner-collection.types.ts | api | application | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/collection/get-owner-collection/get-owner-collection.use-case.ts | api | application | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/collection/issue-invoice/issue-invoice.types.ts | api | application | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/collection/issue-invoice/issue-invoice.use-case.ts | api | application | Reviewed | 1 | Medium | Yes | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/content/accept-policy/accept-policy.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/content/get-content/get-content.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/content/submit-support-request/submit-support-request.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/discovery/list-popular-areas/list-popular-areas.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/discovery/recommend-listings/recommend-listings.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/discovery/record-listing-view/record-listing-view.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/discovery/resolve-location/resolve-location.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/discovery/suggest-search/suggest-search.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/identity/application-authorization.rules.ts | api | application | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/identity/partner-access.rules.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/identity/resolve-principal/__tests__/resolve-principal.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/identity/resolve-principal/resolve-principal.use-case.ts | api | application | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/application/index.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/inquiries/list-my-inquiries/list-my-inquiries.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/inquiries/list-partner-inquiries/list-partner-inquiries.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/inquiries/submit-inquiry/submit-inquiry.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/inquiries/update-inquiry-status/update-inquiry-status.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/create-listing/create-listing.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/create-property-listing/create-property-listing.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/create-sale-listing/create-sale-listing.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/get-owner-listing/get-owner-listing.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/get-partner-listing/get-partner-listing.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/get-sale-terms/get-sale-terms.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/list-areas/list-areas.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/list-owner-listings/list-owner-listings.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/list-owner-properties/list-owner-properties.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/list-owner-resources/list-owner-resources.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/quote-stay/quote-stay.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/register-floor-plan/register-floor-plan.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/register-listing-photo/register-listing-photo.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/remove-floor-plan/remove-floor-plan.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/remove-listing-photo/remove-listing-photo.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/reorder-listing-photos/reorder-listing-photos.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/review-change-proposal/review-change-proposal.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/sale-listing-changes.rules.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/save-sale-terms/save-sale-terms.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/search-listings/__tests__/search-listings.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/search-listings/search-listings.types.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/search-listings/search-listings.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/set-listing-state/set-listing-state.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/update-listing/update-listing.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/update-sale-listing/update-sale-listing.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/view-listing/view-listing.types.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/listings/view-listing/view-listing.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/me/get-me/get-me.types.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/me/get-me/get-me.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/me/get-my-stays/get-my-stays.types.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/me/get-my-stays/get-my-stays.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/me/get-saved-listings/get-saved-listings.types.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/me/get-saved-listings/get-saved-listings.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/me/save-listing/save-listing.types.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/me/save-listing/save-listing.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/me/unsave-listing/unsave-listing.types.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/me/unsave-listing/unsave-listing.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/me/update-my-profile/update-my-profile.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/messaging/get-conversation-messages/get-conversation-messages.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/messaging/list-agent-conversations/list-agent-conversations.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/messaging/list-my-conversations/list-my-conversations.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/messaging/list-organization-conversations/list-organization-conversations.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/messaging/mark-conversation-read/mark-conversation-read.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/messaging/send-message/send-message.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/messaging/start-conversation/start-conversation.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/notifications/list-notifications/list-notifications.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/notifications/mark-notifications-read/mark-notifications-read.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/payments/confirm-booking-payment/confirm-booking-payment.types.ts | api | application | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/payments/confirm-booking-payment/confirm-booking-payment.use-case.ts | api | application | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/payments/simulate-booking-payment/__tests__/simulate-booking-payment.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/payments/simulate-booking-payment/simulate-booking-payment.types.ts | api | application | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/payments/simulate-booking-payment/simulate-booking-payment.use-case.ts | api | application | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/payments/start-booking-payment/start-booking-payment.types.ts | api | application | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/payments/start-booking-payment/start-booking-payment.use-case.ts | api | application | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/ports/index.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/messaging/event-publisher.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/providers/authorization-provider.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/providers/clock.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/providers/id-generator.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/providers/identity-provider.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/providers/job-scheduler.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/providers/panorama-processor.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/providers/payment-gateway.port.ts | api | application | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/ports/providers/verification-image.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/providers/verification-provider.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/agent-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/agent-task-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/analytics-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/application-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/booking-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/content-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/discovery-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/inquiry-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/invoice-repository.port.ts | api | application | Reviewed | 1 | High | Yes | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/ports/repositories/lead-assignment-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/listing-change-proposal-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/listing-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/messaging-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/notification-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/occupancy-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/party-scope.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/payment-repository.port.ts | api | application | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/application/ports/repositories/representation-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/tour-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/user-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/verification-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/repositories/viewing-repository.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/storage/document-storage.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/storage/listing-media.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/storage/media-storage.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/storage/verification-evidence.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/ports/transactions/unit-of-work.port.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/add-hotspot/add-hotspot.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/add-scene/add-scene.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/configure-tour-provider/configure-tour-provider.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/create-owner-tour/create-owner-tour.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/ensure-listing-tour/ensure-listing-tour.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/get-owner-tour/get-owner-tour.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/list-organization-tours/list-organization-tours.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/publish-tour/publish-tour.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/remove-hotspot/remove-hotspot.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/remove-scene/remove-scene.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/rename-scene/rename-scene.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/reorder-scenes/reorder-scenes.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/set-entry-scene/set-entry-scene.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/set-scene-view/set-scene-view.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/unpublish-tour/unpublish-tour.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/update-hotspot/update-hotspot.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/tours/view-tour/view-tour.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/verification/__tests__/verification.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/verification/cancel-verification/cancel-verification.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/verification/capture-face-pose/capture-face-pose.use-case.ts | api | application | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/application/verification/capture-id-front/capture-id-front.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/verification/cleanup-verification-evidence/cleanup-verification-evidence.use-case.ts | api | application | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/application/verification/confirm-id-details/confirm-id-details.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/verification/decide-identity-review/decide-identity-review.use-case.ts | api | application | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/application/verification/get-application-draft/get-application-draft.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/verification/get-verification-status/get-verification-status.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/verification/prepare-face-challenge/prepare-face-challenge.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/verification/record-verification-consent/record-verification-consent.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/verification/resume-verification/resume-verification.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/verification/review-identity-evidence/review-identity-evidence.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/verification/save-application-draft/save-application-draft.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/viewings/customer-viewing-action/customer-viewing-action.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/viewings/customer-viewing-view.rules.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/viewings/get-my-viewing/get-my-viewing.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/viewings/list-my-viewings/list-my-viewings.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/viewings/list-partner-viewings/list-partner-viewings.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/viewings/partner-viewing-action/partner-viewing-action.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/viewings/request-viewing/request-viewing.use-case.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/viewings/viewing-notifications.rules.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/application/viewings/viewing.types.ts | api | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/agents/__tests__/agent.test.ts | api | test | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/agents/agent-dashboard.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/agents/agent-errors.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/agents/agent-rules.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/agents/agent.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/agents/representation.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/applications/__tests__/application.test.ts | api | test | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/applications/application-errors.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/applications/application-events.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/applications/application-rules.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/applications/application-state.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/applications/application.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/assignment/__tests__/assignment-engine.test.ts | api | test | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/assignment/assignment-engine.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/assignment/assignment-policy.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/assignment/assignment-types.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/assignment/lead-assignment.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/bookings/__tests__/stay-quote.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/bookings/booking-errors.ts | api | domain | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/domain/bookings/booking-events.ts | api | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/bookings/booking-rules.ts | api | domain | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/domain/bookings/booking-state.ts | api | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/bookings/booking.ts | api | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/bookings/stay-quote.ts | api | domain | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/domain/collection/__tests__/invoice.test.ts | api | test | Reviewed | 3 | High | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/domain/collection/__tests__/ledger-entry.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/collection/collection-errors.ts | api | domain | Reviewed | 2 | High | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/domain/collection/collection-rules.ts | api | domain | Reviewed | 3 | High | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/domain/collection/collection-state.ts | api | domain | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/domain/collection/collection.ts | api | domain | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/domain/collection/ledger-entry.ts | api | domain | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/domain/content/content.ts | api | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/discovery/__tests__/recommendation.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/discovery/categories.ts | api | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/discovery/recommendation.ts | api | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/identity/identity-errors.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/identity/identity.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/identity/organization-membership.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/identity/role.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/inquiries/__tests__/inquiry.test.ts | api | test | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/inquiries/inquiry-errors.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/inquiries/inquiry-rules.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/inquiries/inquiry.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/listings/__tests__/canonical-property.test.ts | api | test | Reviewed | 0 | None | No | Full 561-test run includes listing domain and persistence tests; per-symbol coverage not measured. |
| apps/api/src/domain/listings/__tests__/listing-rules.test.ts | api | test | Reviewed | 1 | Medium | Yes | Full 561-test run includes listing domain and persistence tests; per-symbol coverage not measured. |
| apps/api/src/domain/listings/canonical-facts.ts | api | domain | Reviewed | 0 | None | No | Full 561-test run includes listing domain and persistence tests; per-symbol coverage not measured. |
| apps/api/src/domain/listings/duplicate-detection.ts | api | domain | Reviewed | 0 | None | No | Full 561-test run includes listing domain and persistence tests; per-symbol coverage not measured. |
| apps/api/src/domain/listings/listing-errors.ts | api | domain | Reviewed | 0 | None | No | Full 561-test run includes listing domain and persistence tests; per-symbol coverage not measured. |
| apps/api/src/domain/listings/listing-rules.ts | api | domain | Reviewed | 1 | Medium | Yes | Full 561-test run includes listing domain and persistence tests; per-symbol coverage not measured. |
| apps/api/src/domain/listings/listing-state.ts | api | domain | Reviewed | 0 | None | No | Full 561-test run includes listing domain and persistence tests; per-symbol coverage not measured. |
| apps/api/src/domain/listings/listing.ts | api | domain | Reviewed | 0 | None | No | Full 561-test run includes listing domain and persistence tests; per-symbol coverage not measured. |
| apps/api/src/domain/listings/move-in-cost.ts | api | domain | Reviewed | 0 | None | No | Full 561-test run includes listing domain and persistence tests; per-symbol coverage not measured. |
| apps/api/src/domain/messaging/__tests__/messaging-rules.test.ts | api | test | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/messaging/conversation.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/messaging/messaging-errors.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/messaging/messaging-rules.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/notifications/notification.ts | api | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/occupancy/__tests__/occupancy.test.ts | api | test | Reviewed | 1 | Medium | Yes | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/occupancy/occupancy-errors.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/occupancy/occupancy-rules.ts | api | domain | Reviewed | 1 | Medium | Yes | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/occupancy/occupancy-state.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/occupancy/occupancy.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/payments/__tests__/payment-rules.test.ts | api | test | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/domain/payments/payment-errors.ts | api | domain | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/domain/payments/payment-rules.ts | api | domain | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/domain/payments/payment-state.ts | api | domain | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/domain/payments/payment.ts | api | domain | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/domain/reservations/reservation-state.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/reservations/reservation.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/shared/__tests__/geo.test.ts | api | test | Reviewed | 0 | None | No | Existing geography regressions included in full suite; per-symbol coverage not measured. |
| apps/api/src/domain/shared/__tests__/money.test.ts | api | test | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/domain/shared/aggregate-root.ts | api | domain | Reviewed | 0 | None | No | Existing geography regressions included in full suite; per-symbol coverage not measured. |
| apps/api/src/domain/shared/calendar.ts | api | domain | Reviewed | 1 | Medium | Yes | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/domain/shared/domain-error.ts | api | domain | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/domain/shared/domain-event.ts | api | domain | Reviewed | 0 | None | No | Existing geography regressions included in full suite; per-symbol coverage not measured. |
| apps/api/src/domain/shared/entity.ts | api | domain | Reviewed | 0 | None | No | Existing geography regressions included in full suite; per-symbol coverage not measured. |
| apps/api/src/domain/shared/geo.ts | api | domain | Reviewed | 0 | None | No | Existing geography regressions included in full suite; per-symbol coverage not measured. |
| apps/api/src/domain/shared/money.ts | api | domain | Reviewed | 1 | Medium | Yes | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/domain/shared/organization-scope.ts | api | domain | Reviewed | 0 | None | No | Existing geography regressions included in full suite; per-symbol coverage not measured. |
| apps/api/src/domain/tours/__tests__/tour-provider.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/tours/__tests__/tour.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/tours/tour-errors.ts | api | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/tours/tour-rules.ts | api | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/tours/tour-state.ts | api | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/tours/tour.ts | api | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/verification/__tests__/rental-application-policy.test.ts | api | test | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/verification/__tests__/verification.fixture.ts | api | test | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/verification/__tests__/verification.test.ts | api | test | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/verification/verification.ts | api | domain | Reviewed | 0 | None | No | Included in full 553-test disposable PostgreSQL run; method-level coverage not measured. |
| apps/api/src/domain/viewings/__tests__/viewing.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/viewings/viewing-errors.ts | api | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/viewings/viewing-rules.ts | api | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/domain/viewings/viewing.ts | api | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/config/__tests__/cors-options.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/config/__tests__/environment-config.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/config/cors-options.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/config/environment-config.ts | api | infrastructure | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/infrastructure/http/__tests__/webhook-body.test.ts | api | test | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/infrastructure/http/webhook-body.adapter.ts | api | infrastructure | Reviewed | 1 | High | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/infrastructure/identity/authorization.adapter.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/media/__tests__/sharp-panorama-processor.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/media/sharp-panorama-processor.adapter.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/messaging/event-publisher.adapter.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/payments/__tests__/sandbox-payment-gateway.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/payments/payment-mappers.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/payments/sandbox-payment-gateway.adapter.ts | api | infrastructure | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/infrastructure/payments/unavailable-payment-gateway.adapter.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/__tests__/applications.integration.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/__tests__/helpers/verified-draft.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/__tests__/identity.integration.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/__tests__/invoices.integration.test.ts | api | test | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/infrastructure/postgres/__tests__/lead-assignment.integration.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/__tests__/listings.integration.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/__tests__/marketplace-flow.integration.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/__tests__/occupancy.integration.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/__tests__/partner-marketplace.integration.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/__tests__/payments.integration.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/__tests__/rental-policy.integration.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/__tests__/reservations.integration.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/__tests__/tour-authoring.integration.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/__tests__/tours.integration.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/__tests__/verification.integration.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/db.ts | api | infrastructure | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/infrastructure/postgres/repositories/postgres-agent-task.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-agent.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-analytics.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-application.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-booking.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-content.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-discovery.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-inquiry.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-invoice.repository.ts | api | infrastructure | Reviewed | 3 | High | Yes | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/infrastructure/postgres/repositories/postgres-lead-assignment.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-listing-change-proposal.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-listing.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-messaging.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-notification.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-occupancy.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-payment.repository.ts | api | infrastructure | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/infrastructure/postgres/repositories/postgres-representation.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-tour.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-user.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-verification.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/postgres-viewing.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/repositories/rental-application-policy.repository.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/postgres/transactions/postgres-unit-of-work.adapter.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/storage/__tests__/verification-review-storage.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/storage/supabase-document-storage.adapter.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/storage/supabase-listing-media.adapter.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/storage/supabase-media-storage.adapter.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/storage/supabase-verification-evidence.adapter.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/supabase/__tests__/jwks-identity.provider.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/supabase/jwks-identity.provider.ts | api | infrastructure | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/infrastructure/system/interval-job-scheduler.adapter.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/system/system-clock.provider.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/system/uuid-generator.provider.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/verification/__tests__/verification-image.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/verification/manual-review-verification.adapter.ts | api | infrastructure | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/infrastructure/verification/sharp-verification-image.adapter.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/infrastructure/verification/unavailable-verification.adapter.ts | api | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/main.ts | api | configuration/documentation | Reviewed | 1 | High | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/modules/agents/agent.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/agents/agents.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/agents/controllers/admin-agents.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/agents/controllers/agent-workspace.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/agents/controllers/organization-agents.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/agents/controllers/public-agents.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/agents/dto/agent.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/agents/mappers/agent-http.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/__tests__/verification.dto.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/application.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/applications.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/controllers/attach-application-document.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/controllers/decide-application.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/controllers/get-my-application.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/controllers/get-my-applications.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/controllers/list-organization-applications.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/controllers/reserve-application.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/controllers/submit-application.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/controllers/verification.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/controllers/withdraw-application.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/dto/attach-document.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/dto/decide-application.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/dto/submit-application.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/dto/verification.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/mappers/applications-http.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/mappers/verification-http.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/verification.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/applications/verification.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/assignment/assignment.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/assignment/assignment.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/assignment/controllers/agent-referrals.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/assignment/dto/referral.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/bookings/booking.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/bookings/bookings.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/bookings/controllers/my-bookings.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/bookings/controllers/organization-bookings.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/bookings/controllers/place-hold.controller.ts | api | presentation/composition | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/modules/bookings/controllers/view-availability.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/bookings/dto/booking.dto.ts | api | presentation/composition | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/modules/bookings/mappers/booking-http.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/collection/__tests__/collection.controller.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/collection/collection.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/collection/collection.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/collection/controllers/apply-payment-to-invoice.controller.ts | api | presentation/composition | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/modules/collection/controllers/get-owner-collection.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/collection/controllers/issue-invoice.controller.ts | api | presentation/composition | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/modules/collection/dto/apply-payment.dto.ts | api | presentation/composition | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/modules/collection/dto/issue-invoice.dto.ts | api | presentation/composition | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/modules/collection/mappers/collection-http.mapper.ts | api | presentation/composition | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/modules/content/content.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/content/content.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/content/controllers/content.controller.ts | api | presentation/composition | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/modules/content/dto/content.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/content/mappers/content-http.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/discovery/__tests__/discovery.controller.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/discovery/controllers/discovery.controller.ts | api | presentation/composition | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/modules/discovery/discovery.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/discovery/discovery.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/discovery/dto/discovery.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/discovery/mappers/discovery-http.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/inquiries/controllers/customer-inquiries.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/inquiries/controllers/partner-inquiries.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/inquiries/dto/inquiry.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/inquiries/inquiries.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/inquiries/inquiry.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/inquiries/mappers/inquiry-http.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/listings/__tests__/listings.contract.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/listings/controllers/agent-listings.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/listings/controllers/locations.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/listings/controllers/owner-listings.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/listings/controllers/owner-sale-listings.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/listings/controllers/search-listings.controller.ts | api | presentation/composition | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/modules/listings/controllers/view-listing.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/listings/dto/listing.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/listings/dto/owner-listing.dto.ts | api | presentation/composition | Reviewed | 0 | None | No | Existing DTO/HTTP and integration tests; full per-operation refinement coverage pending. |
| apps/api/src/modules/listings/listing.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/listings/listings.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/listings/mappers/listing-http.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/listings/mappers/listing-query.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/me/controllers/get-me.controller.ts | api | presentation/composition | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/modules/me/controllers/get-my-stays.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/me/controllers/saved-listings.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/me/dto/save-listing.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/me/mappers/me-http.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/me/mappers/stay-http.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/me/me.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/me/me.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/messaging/controllers/agent-conversations.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/messaging/controllers/customer-conversations.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/messaging/controllers/organization-conversations.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/messaging/dto/messaging.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/messaging/mappers/messaging-http.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/messaging/messaging.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/messaging/messaging.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/notifications/controllers/notifications.controller.ts | api | presentation/composition | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/modules/notifications/dto/notifications.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/notifications/mappers/notification-http.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/notifications/notifications.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/notifications/notifications.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/payments/controllers/confirm-booking-payment.controller.ts | api | presentation/composition | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/modules/payments/controllers/simulate-booking-payment.controller.ts | api | presentation/composition | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/modules/payments/controllers/start-booking-payment.controller.ts | api | presentation/composition | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/modules/payments/dto/payment.dto.ts | api | presentation/composition | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/modules/payments/mappers/payment-http.mapper.ts | api | presentation/composition | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| apps/api/src/modules/payments/payment.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/payments/payments.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/shared/__tests__/http-exception.filter.test.ts | api | test | Reviewed | 2 | High | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/modules/shared/http-exception.filter.ts | api | presentation/composition | Reviewed | 2 | High | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/api/src/modules/shared/identity.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/shared/platform.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/shared/shared.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/tours/controllers/agent-tour.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/tours/controllers/author-tour.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/tours/controllers/view-tour.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/tours/dto/tour.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/tours/mappers/tour-http.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/tours/tour.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/tours/tours.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/viewings/controllers/customer-viewings.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/viewings/controllers/partner-viewings.controller.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/viewings/dto/viewing.dto.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/viewings/mappers/viewing-http.mapper.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/viewings/viewing.tokens.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/modules/viewings/viewings.module.ts | api | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/tests/architecture/application-purity.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/tests/architecture/arch-helper.ts | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/tests/architecture/circular-dependencies.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/tests/architecture/controller-boundaries.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/tests/architecture/dependency-rules.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/tests/architecture/domain-purity.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/src/tests/architecture/port-purity.test.ts | api | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/tsconfig.json | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/api/vitest.config.ts | api | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/.gitignore | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/.metadata | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/README.md | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/analysis_options.yaml | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/.gitignore | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/app/build.gradle | customer_app | presentation/composition | Reviewed | 1 | High | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/android/app/src/debug/AndroidManifest.xml | customer_app | presentation/composition | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/android/app/src/development/AndroidManifest.xml | customer_app | presentation/composition | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/android/app/src/main/AndroidManifest.xml | customer_app | presentation/composition | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/android/app/src/main/kotlin/com/rentalplatform/customer_app/MainActivity.kt | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/app/src/main/res/drawable-v21/launch_background.xml | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/app/src/main/res/drawable/launch_background.xml | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/app/src/main/res/values-night/styles.xml | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/app/src/main/res/values/colors.xml | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/app/src/main/res/values/ic_launcher_background.xml | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/app/src/main/res/values/styles.xml | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/app/src/profile/AndroidManifest.xml | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/build.gradle | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/gradle.properties | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/gradle/wrapper/gradle-wrapper.properties | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/android/settings.gradle | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/config/development.example.json | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/config/production.example.json | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/config/staging.example.json | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/docs/ios-simulator-build.md | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/docs/rental-details-refactor.md | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/integration_test/mlkit_native_test.dart | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/integration_test/verification_camera_test.dart | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/.gitignore | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Flutter/AppFrameworkInfo.plist | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Flutter/Debug-development.xcconfig | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Flutter/Debug-production.xcconfig | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Flutter/Debug-staging.xcconfig | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Flutter/Debug.xcconfig | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Flutter/Profile-development.xcconfig | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Flutter/Profile-production.xcconfig | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Flutter/Profile-staging.xcconfig | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Flutter/Profile.xcconfig | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Flutter/Release-development.xcconfig | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Flutter/Release-production.xcconfig | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Flutter/Release-staging.xcconfig | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Flutter/Release.xcconfig | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Podfile | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Runner.xcodeproj/project.pbxproj | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Runner.xcodeproj/project.xcworkspace/contents.xcworkspacedata | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Runner.xcodeproj/project.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Runner.xcodeproj/project.xcworkspace/xcshareddata/WorkspaceSettings.xcsettings | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Runner.xcodeproj/xcshareddata/xcschemes/Runner.xcscheme | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Runner.xcodeproj/xcshareddata/xcschemes/development.xcscheme | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Runner.xcodeproj/xcshareddata/xcschemes/production.xcscheme | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Runner.xcodeproj/xcshareddata/xcschemes/staging.xcscheme | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Runner.xcworkspace/contents.xcworkspacedata | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Runner.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Runner.xcworkspace/xcshareddata/WorkspaceSettings.xcsettings | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Runner/AppDelegate.swift | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Runner/Assets.xcassets/LaunchImage.imageset/Contents.json | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/Runner/Info.plist | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/ios/Runner/Runner-Bridging-Header.h | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/RunnerTests/RunnerTests.swift | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/scripts/mlkit_apple_silicon/README.md | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/scripts/mlkit_apple_silicon/apple_silicon_simulator.rb | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/ios/scripts/mlkit_apple_silicon/patch_arm64_simulator.py | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/app/app.dart | customer_app | presentation/composition | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/app/app_config.dart | customer_app | presentation/composition | Reviewed | 1 | High | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/app/bootstrap/app_bootstrap.dart | customer_app | presentation/composition | Reviewed | 1 | High | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/app/bootstrap/app_bootstrap_error_view.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/app/bootstrap/app_bootstrap_state.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/app/clock.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/app/router.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/app/shell_destination.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/account_repository.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/api_client.dart | customer_app | infrastructure | Reviewed | 1 | High | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/data/application_repository.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/auth_repository.dart | customer_app | infrastructure | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/data/availability_repository.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/booking_repository.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/content_repository.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/device_verification_camera.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/discovery_repository.dart | customer_app | infrastructure | Reviewed | 1 | Medium | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/data/ids.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/listing_query.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/listing_repository.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/marketplace_repository.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/messaging_repository.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/mlkit_camera_image.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/mlkit_verification_analyzer.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/notification_repository.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/offline_cache.dart | customer_app | infrastructure | Reviewed | 1 | Medium | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/data/preferences_store.dart | customer_app | infrastructure | Reviewed | 1 | Medium | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/data/tour_repository.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/data/verification_repository.dart | customer_app | infrastructure | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/data/viewing_repository.dart | customer_app | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/app_image.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/components.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/controls.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/glass.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/glass_bottom_nav.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/home_assets.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/money.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/motion.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/osm_map.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/quantity_stepper.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/seasonal_header_background.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/theme.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/tokens.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/typography.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/virtual_tour_action.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/design/virtual_tour_icon.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/account/account_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/activity/activity_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/agents/agent_profile_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/application_controller.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/application_details_view.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/application_flow_view.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/application_property_summary.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/application_styles.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/applications_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/apply_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/domain/face_guidance.dart | customer_app | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/domain/id_ocr_parser.dart | customer_app | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/domain/verification.dart | customer_app | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/domain/verification_capture.dart | customer_app | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/domain/verification_repository.dart | customer_app | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/id_scan_guide.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/identity_review_form.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/verification_assets.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/verification_camera_view.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/verification_panel.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/verification_processing_sheet.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/verification_result_view.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/application/verification_stage_surface.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/auth/auth_guard.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/auth/auth_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/booking/booking_checkout_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/booking/booking_dates_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/booking/widgets/date_range_calendar.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/bookings/booking_detail_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/bookings/bookings_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/bookings/widgets/empty_bookings.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/discovery/discovery_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/discovery/home_shortcut.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/discovery/widgets/discover_header.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/discovery/widgets/listing_card.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/discovery/widgets/property_card.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/editorial/application/editorial_content.dart | customer_app | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/editorial/domain/editorial_card.dart | customer_app | domain | Reviewed | 1 | Medium | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/features/editorial/presentation/editorial_carousel.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/editorial/presentation/editorial_routes.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/application/discovery_feeds.dart | customer_app | application | Reviewed | 1 | Medium | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/features/explore/application/explore_controller.dart | customer_app | application | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/features/explore/application/explore_results.dart | customer_app | application | Reviewed | 1 | Medium | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/features/explore/application/search_suggestions.dart | customer_app | application | Reviewed | 2 | Medium | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/features/explore/application/stay_search_controller.dart | customer_app | application | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/application/stay_search_state.dart | customer_app | application | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/features/explore/domain/calendar_day.dart | customer_app | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/domain/display_currency.dart | customer_app | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/domain/explore_mode.dart | customer_app | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/domain/explore_query.dart | customer_app | domain | Reviewed | 1 | Medium | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/features/explore/domain/explore_query_codec.dart | customer_app | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/domain/listing_category.dart | customer_app | domain | Reviewed | 1 | Medium | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/features/explore/domain/stay_search_policy.dart | customer_app | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/domain/stay_validation.dart | customer_app | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/buy_search_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/explore_icons.dart | customer_app | presentation/composition | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/lib/features/explore/presentation/explore_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/rent_search_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/stay_results_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/stay_search_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/buy_filters_sheet.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/category_photo_card.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/currency_button.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/explore_concierge_card.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/explore_popular_areas.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/faq_section.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/filter_sheet_frame.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/info_section.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/listing_results_scroll_view.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/listing_results_sliver.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/listing_search_header.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/listing_search_scaffold.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/price_sheet.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/rent_filters_sheet.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/results_count_bar.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/search_suggestions_panel.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/search_summary_chip.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/sort_sheet.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/stay_date_fields.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/stay_header.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/stay_occupancy_field.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/stay_search_card.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/stay_summary_bar.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/explore/presentation/widgets/why_book_section.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/inbox/conversation_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/inbox/messages_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/inbox/notifications_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/inbox/start_conversation_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/inquiry/inquiry_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/launch/splash_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/legal/contact_support_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/legal/content_body.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/legal/content_page_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/legal/content_sheet.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/legal/help_center_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/legal/legal_document.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/legal/policy_agreement_note.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/listing/listing_detail_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/listing/listing_price.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/listing/sale/sale_listing_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/listing/widgets/animated_360_indicator.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/listing/widgets/listing_attributes.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/listing/widgets/move_in_cost_card.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/listing/widgets/rental_action_bar.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/listing/widgets/tour_callout_card.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/location/location_controller.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/location/location_sheet.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/saved/saved_controller.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/saved/saved_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/shell/home_shell.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/tour/panorama/panorama_source.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/tour/panorama/panorama_view.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/tour/tour_intro_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/tour/tour_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/viewing/request_viewing_controller.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/viewing/request_viewing_screen.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/viewing/widgets/assigned_agent_card.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/viewing/widgets/matching_progress.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/viewing/widgets/viewing_animation.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/viewing/widgets/viewing_buttons.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/viewing/widgets/viewing_day_strip.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/viewing/widgets/viewing_icon.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/viewing/widgets/viewing_property_card.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/viewing/widgets/viewing_time_window_picker.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/features/viewing/widgets/viewing_timeline.dart | customer_app | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/fixtures/view_models.dart | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/lib/main.dart | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/macos/.gitignore | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Flutter/Flutter-Debug.xcconfig | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Flutter/Flutter-Release.xcconfig | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Podfile | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner.xcodeproj/project.pbxproj | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner.xcodeproj/project.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner.xcodeproj/xcshareddata/xcschemes/Runner.xcscheme | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner.xcworkspace/contents.xcworkspacedata | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner/AppDelegate.swift | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner/Configs/AppInfo.xcconfig | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner/Configs/Debug.xcconfig | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner/Configs/Release.xcconfig | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner/Configs/Warnings.xcconfig | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner/DebugProfile.entitlements | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner/Info.plist | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner/MainFlutterWindow.swift | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/Runner/Release.entitlements | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/macos/RunnerTests/RunnerTests.swift | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/pubspec.yaml | customer_app | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/test/account_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/api_client_errors_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/app_config_test.dart | customer_app | test | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/test/application_reference_layout_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/application_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/architecture_boundaries_test.dart | customer_app | test | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/test/availability_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/booking_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/bootstrap_test.dart | customer_app | test | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/test/build_config_test.dart | customer_app | test | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/test/customer_app_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/design/virtual_tour_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/explore_application_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/explore_domain_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/flutter_test_config.dart | customer_app | test | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/test/listing_repository_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/listing_search_experience_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/motion_tap_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/offline_cache_test.dart | customer_app | test | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/test/panorama_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/partner_marketplace_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/property_images_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/recent_searches_lifecycle_test.dart | customer_app | test | Reviewed | 1 | Medium | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/customer_app/test/rental_action_bar_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/request_viewing_controller_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/splash_screen_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/stay_search_flow_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/stay_search_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/support/fake_auth.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/support/listing_json.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/support/sample_data.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/verification_camera_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/verification_domain_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/verification_flow_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test/verification_widget_test.dart | customer_app | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/test_driver/verification_driver.dart | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/web/index.html | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/customer_app/web/manifest.json | customer_app | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/.env.example | owner-web | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/.gitignore | owner-web | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/AGENTS.md | owner-web | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/owner-web/CLAUDE.md | owner-web | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/__tests__/application-boundaries.test.mjs | owner-web | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/__tests__/architecture.test.mjs | owner-web | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/__tests__/dashboard.test.mjs | owner-web | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/__tests__/fixtures/insight-chart-preview.mjs | owner-web | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/__tests__/fixtures/owner-dashboard.mjs | owner-web | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/__tests__/helpers/load-store.mjs | owner-web | test | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/owner-web/__tests__/http-timeout.test.mjs | owner-web | test | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/owner-web/__tests__/mvp-functional-verification.test.mjs | owner-web | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/__tests__/owner-dashboard.browser.mjs | owner-web | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/__tests__/owner-domain.test.mjs | owner-web | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/__tests__/partner-portal-domain.test.mjs | owner-web | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/__tests__/session-lifetime.test.mjs | owner-web | test | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/owner-web/__tests__/sparkline.test.mjs | owner-web | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/__tests__/store-isolation.test.mjs | owner-web | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/__tests__/tenant-isolation.test.mjs | owner-web | test | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/account/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/agent/analytics/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/agent/clients/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/agent/leads/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/agent/messages/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/agent/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/agent/profile/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/agent/properties/[id]/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/agent/properties/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/agent/tasks/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/agent/tours/[listingId]/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/agent/tours/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/agent/viewings/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/analytics/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/applications/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/bookings/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/inquiries/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/layout.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/messages/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/payments/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/properties/[id]/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/properties/new/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/properties/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/tours/[listingId]/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/tours/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/(owner)/viewings/page.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/globals.css | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/app/layout.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/application/ports/file-reader.port.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/ports/owner-repository.port.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/ports/partner-repository.port.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/ports/photo-storage.port.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/ports/realtime.port.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/ports/session.port.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/use-cases/applications/applications.use-cases.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/use-cases/bookings/bookings.use-cases.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/use-cases/dashboard/load-dashboard.use-case.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/use-cases/listings/listings.use-cases.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/use-cases/messaging/messaging.use-cases.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/use-cases/notifications/notifications.use-cases.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/use-cases/partner/agents.use-cases.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/use-cases/partner/engagement.use-cases.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/use-cases/partner/sale-listings.use-cases.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/use-cases/partner/tours.use-cases.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/application/use-cases/session/session.use-cases.ts | owner-web | application | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| apps/owner-web/components.json | owner-web | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/agent-setup.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/analytics-view.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/brand.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/dashboard-activity.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/dashboard-icon.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/dashboard-insights.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/dashboard-metric.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/dashboard-view-model.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/inquiry-board.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/insight-chart.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/insight-palette.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/insight-sparkline.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/listing-editor.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/listing-form.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/messages-inbox.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/panorama-viewer.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/photo.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/shell.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/sign-in.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/sparkline-option.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/tour-studio.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/ui.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/owner/viewing-schedule.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/ui/avatar.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/ui/badge.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/ui/button.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/ui/card.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/ui/dialog.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/ui/input.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/ui/label.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/ui/progress.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/ui/separator.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/ui/sheet.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/ui/skeleton.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/ui/sonner.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/ui/table.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/components/ui/tabs.tsx | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/docs/architecture-audit.md | owner-web | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/docs/dashboard-chart-fidelity.md | owner-web | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/docs/owner-dashboard-implementation.md | owner-web | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/agents/agent.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/agents/dashboard.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/agents/permissions.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/analytics/analytics.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/applications/application.schema.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/applications/application.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/bookings/booking.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/inquiries/inquiry.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/listings/listing-form.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/listings/listing.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/messaging/conversation.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/notifications/notification.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/payments/collection.schema.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/payments/collection.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/session/session.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/tours/tour.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/viewings/viewing.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/workspace/navigation.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/domain/workspace/workspace.ts | owner-web | domain | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/eslint.config.mjs | owner-web | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/infrastructure/auth/supabase-session.adapter.ts | owner-web | infrastructure | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/owner-web/infrastructure/composition/owner-web-container.ts | owner-web | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/infrastructure/config/env.ts | owner-web | infrastructure | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/owner-web/infrastructure/http/api-owner-repository.adapter.ts | owner-web | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/infrastructure/http/api-partner-repository.adapter.ts | owner-web | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/infrastructure/http/dto/application.dto.ts | owner-web | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/infrastructure/http/dto/collection.dto.ts | owner-web | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/infrastructure/http/dto/owner.dto.ts | owner-web | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/infrastructure/http/dto/partner.dto.ts | owner-web | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/infrastructure/http/http-client.ts | owner-web | infrastructure | Reviewed | 1 | Medium | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/owner-web/infrastructure/realtime/supabase-realtime.adapter.ts | owner-web | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/infrastructure/storage/browser-file-reader.adapter.ts | owner-web | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/infrastructure/storage/supabase-photo-storage.adapter.ts | owner-web | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/infrastructure/supabase/browser-client.ts | owner-web | infrastructure | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/lib/csv.ts | owner-web | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/lib/money.ts | owner-web | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/lib/utils.ts | owner-web | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/next.config.ts | owner-web | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/package.json | owner-web | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| apps/owner-web/postcss.config.mjs | owner-web | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/stores/use-agent-store.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/stores/use-analytics-store.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/stores/use-applications-store.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/stores/use-bookings-store.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/stores/use-dashboard-store.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/stores/use-engagement-store.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/stores/use-listing-editor-store.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/stores/use-listings-store.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/stores/use-messages-store.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/stores/use-notifications-store.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/stores/use-representation-store.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/stores/use-session-store.ts | owner-web | presentation/composition | Reviewed | 1 | High | Yes | See 06-test-results; per-symbol coverage not measured |
| apps/owner-web/stores/use-tour-studio-store.ts | owner-web | presentation/composition | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| apps/owner-web/tsconfig.json | owner-web | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/00-overview/glossary.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/00-overview/payments-overview.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/00-overview/personas.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/00-overview/product-decisions.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/00-overview/product-scope.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/00-overview/rental-lifecycle.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/00-overview/vision.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/01-product/customer/journey.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/01-product/owner/journey.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/01-product/platform-admin/journey.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/01-product/property-staff/journey.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/01-product/roles-and-permissions.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/01-product/tenant/journey.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/02-architecture/README.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/02-architecture/architecture-principles.md | docs | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| docs/02-architecture/authentication.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/02-architecture/authorization.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/02-architecture/data-flow.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/02-architecture/hexagonal-architecture.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/02-architecture/multi-tenancy.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/02-architecture/system-architecture.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/02-architecture/vertical-slice.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/03-domain/README.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/03-domain/entities.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/03-domain/invariants.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/03-domain/money-model.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/03-domain/occupancy-model.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/03-domain/relationships.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/03-domain/state-machines.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/04-api/README.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/05-database/README.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/05-database/occupancy.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/06-frontend/customer-app.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/06-frontend/flutter-toolchain.md | docs | configuration/documentation | Reviewed | 1 | Low | Yes | See 06-test-results; per-symbol coverage not measured |
| docs/06-frontend/owner-web.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/06-frontend/tenant-web.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/06-frontend/web-toolchain.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/07-integrations/media.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/07-integrations/payments.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/07-integrations/virtual-tour-pipeline.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/08-security/authn.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/11-implementation/mvp-roadmap.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/11-implementation/partner-marketplace-map.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/11-implementation/pilot-demo-script.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/11-implementation/running-locally.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/11-implementation/sprint-5-decisions.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/12-adr/0001-supabase-api-mediated.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/12-adr/0002-typescript-api-service.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/12-adr/0003-hexagonal-vertical-slice.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/12-adr/0004-availability-projection.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/12-adr/0005-occupancy-write-serialization.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/12-adr/0006-multi-tenancy-enforcement.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/12-adr/0007-identity-and-sessions.md | docs | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| docs/12-adr/0008-payment-provider-port.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/12-adr/0009-media-pipeline.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/12-adr/0010-web-stack.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/12-adr/0011-transactional-outbox.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/12-adr/0012-nestjs-decorator-free-application.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/12-adr/README.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/README.md | docs | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| docs/environment-management.md | docs | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| scripts/audit-inventory.py | scripts | configuration/documentation | Reviewed | 1 | Medium | Yes | See 06-test-results; review does not imply complete behavior coverage |
| scripts/check-public-config.py | scripts | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; per-symbol coverage not measured |
| scripts/test_audit_inventory.py | scripts | configuration/documentation | Reviewed | 0 | None | No | See 06-test-results; review does not imply complete behavior coverage |
| supabase/.gitignore | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/config.toml | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/demo/reset-demo.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/demo/seed-demo.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/demo/seed-discovery.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20260821000100_listings.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20260822000100_public_inventory_read.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20260822000200_identity.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20260822000300_occupancy.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20260822000400_money.sql | supabase | configuration/documentation | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| supabase/migrations/20260822000500_booking_owner.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20260822000600_applications.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20260822000700_reservation_fee.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20260823000100_approval_hold.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20260823000200_subtree_maintenance.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20260823000300_tours.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20260823000400_tour_authoring_grants.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20260824000100_invoices.sql | supabase | configuration/documentation | Reviewed | 1 | High | Yes | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| supabase/migrations/20261007000100_listing_details.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261007000200_messaging.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261007000300_storage_and_hardening.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261007000400_function_hardening.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261007000500_booking_guests_idempotency.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261007000600_participant_read_policies.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261007000700_reconcile_policy_drift.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261007000800_storage_member_select.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261007000900_invoice_policy_nullif.sql | supabase | configuration/documentation | Reviewed | 0 | None | No | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| supabase/migrations/20261008000100_sale_listings_and_geo.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261008000200_agents_and_representation.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261008000300_inquiries_viewings_agent_messaging.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261008000400_tour_providers_floor_plans.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261009000100_discovery_attributes_and_search.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261009000200_content_pages_and_consent.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261009000300_westayplace_content_drafts.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261010000100_representation_assignment_viewing_requests.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261020174429_application_identity_verification.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261021110318_rental_application_policy.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/migrations/20261022131003_guard_payment_allocations.sql | supabase | configuration/documentation | Reviewed | 1 | High | Yes | continuation-api-full.log: 540 backend tests passed; per-method coverage not measured |
| supabase/seed-tours.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/seed.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
| supabase/tests/local-supabase-stubs.sql | supabase | configuration/documentation | Static scan only; detailed review pending | Unknown | Not assessed | Not assessed | Not mapped |
