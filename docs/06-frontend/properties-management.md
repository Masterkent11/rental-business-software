# Owner Properties management

Implemented against the supplied Properties reference at 1808 × 870, with responsive mobile layout. Styling is scoped to `.properties-page`; dashboard layout and sidebar structure/navigation are preserved. Photos, listing names, states and counts come from the API, not the reference screenshot. Visual browser review was performed; exact pixel equivalence is not certified because existing sidebar geometry, fonts and live content differ from the reference.

## Data and actions

- Existing authenticated `GET /organizations/:organizationId/listings` now includes owner-only `activity: { views, inquiries, viewings }` for each row. Counts are all-time recorded activity; views represent authenticated `listing_view_events`, not all anonymous visits or unique visitors.
- Organization authorization remains in `listOwnerListings`; database reads remain under `withScope`. Two batched queries load listings and activity, rather than one HTTP request per row.
- Sale prices remain “Price on inquiry”. Rental amounts use authoritative integer centavos and nightly/monthly units.
- Search, status tabs, staged location/property-type/sort filters, six-item pagination, grid display and map selection use the loaded organization inventory. Filters expand directly below the search toolbar as in the supplied second reference. Draft choices do not change rows until Apply filters; Clear all resets draft/applied choices and pagination. The map uses existing OpenStreetMap integration and persisted coordinates.
- Edit/create links retain existing editors. Publish, unpublish and archive retain existing use cases and confirmation dialog. Duplicate mutations are suppressed; action responses retain previously loaded activity when omitted.
- Inquiry/viewing links carry a listing filter supported by their destination screens.
- Loading, error/retry and empty states reuse existing UI. Missing activity is shown as unavailable, never fabricated.

## Database rollout

`supabase/migrations/20261022194244_owner_listing_activity.sql` adds a SELECT-only policy for `rental_app` to read events for listings in the transaction's organization. Existing customer event read/write policy remains. No new privileges are granted to `anon` or `authenticated`; HTTP clients receive aggregate counts only.

The migration has been applied and tested only in a disposable local cluster. Apply through the normal reviewed migration/deployment process before deploying the new API; otherwise RLS prevents owner view totals from being complete. No live database changes or deployment were performed.

## Verification

- API: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run contracts:generate`, `npm run contracts:validate` passed. Export remains 180 routes.
- `npm run test:isolated`: 562 tests passed, no skips. New integration check inserts a real view event and verifies owning-organization visibility, foreign-organization denial, unscoped denial and populated activity.
- Owner: typecheck, lint and production build passed; `npm test`: 68 passed. New store regressions cover duplicate actions, activity retention and presentation reset across workspace changes.
- `owner-properties.browser.mjs`: desktop/mobile, search, pagination, location/type/sort and status filters, grid/map, cancelled/confirmed mutation, retry and empty state passed using synthetic browser auth/API fixtures. Browser fixtures do not replace real database integration tests and do not establish a live authenticated end-to-end run.
- Public configuration scanner and `git diff --check` passed.

Local evidence: `/private/tmp/wsp-properties-{api-tests,owner-tests,browser,build}.log`; browser screenshots in `/private/tmp/wsp-properties-qa/`. Browser invocation uses the existing Playwright installation through `PLAYWRIGHT_PACKAGE` and a separately running Owner server through `OWNER_QA_BASE_URL`.
