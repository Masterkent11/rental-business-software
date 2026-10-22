# Owner Web uncommitted changes: architecture audit

Audit baseline: 22 October 2026, before the controlled refactor. Original line numbers below refer to the preserved pre-refactor files, not the moving working tree. A complete file/hash inventory and ZIP snapshot are in `/private/tmp/wsp-owner-architecture-audit/inventory.json` and `before.zip`. No changes were staged, discarded or committed.

## Findings recorded before refactoring

Severity: P1 = private client-state isolation; P2 = correctness or architectural boundary; P3 = maintenance/performance. A client-state leak is not evidence of a backend authorization bypass.

| Severity | File:Line (under apps/owner-web) | Symbol | Confirmed finding and evidence | Principle / recommended correction | Regression risk |
| --- | --- | --- | --- | --- | --- |
| P1 | stores/use-messages-store.ts:145,159,184 | loadOlder, send, retry | Old pagination appended an old workspace's private message to a new thread in a test of the actual store. An old send acknowledgement invoked refresh in the new workspace. open/read callbacks also lack complete lifetime guards. These paths predate the dashboard diff. | Guard asynchronous commits and subscription callbacks by workspace lifetime and conversation lifetime; clear private state on stop. | Medium: read acknowledgements, pagination and optimistic sends need focused tests. |
| P1 | stores/use-notifications-store.ts:32,49 | start | A delayed organization A response overwrote organization B's notifications in an actual-store test. The existing shell subscribes to this adjacent store. | Add subscription/request lifetime guards and clear latest/error/open state on stop. | Low: preserve mark-read behavior and subscription ownership. |
| P1 | stores/use-engagement-store.ts:82,134,146 | stop, move, act | stop retains selection/form state; a rejected old inquiry mutation sets a private error in the new workspace. Mutations and queued subscription callbacks are not guarded. | Clear scope-owned state and reject obsolete callbacks without moving workflow rules into the store. | Medium: preserve domain/use-case transition decisions. |
| P1 | stores/use-dashboard-store.ts:21,26; components/owner/shell.tsx:226 | cache lifecycle | Financial/listing cache survives auth teardown; matching only organization ID does not identify a new authenticated lifetime. Analytics has the same missing teardown path. | Add explicit store reset/invalidation and connect it to existing authenticated subscription cleanup. | Medium: direct Payments navigation and effect ordering. |
| P1 | stores/use-bookings-store.ts:50,83; stores/use-listings-store.ts:43 | load, select, runAction | Surrounding stores used by the changed destination pages commit responses without organization or selection/request identity. Delayed responses can replace the current organization's rows/details. Predates the dashboard diff. | Add local organization/request identity and reset/invalidation; keep server status and permission rules authoritative. | Medium: existing selection, pagination and confirmation behavior. |
| P2 | stores/use-analytics-store.ts:19,24 | load | Key equality alone accepts an old A response after A→B→A and accepts older same-scope failures. Reproduced with the actual store. Engagement loaders and message refresh have the same equality-only weakness. | Request sequence checks in addition to workspace identity; do not change ports solely to cancel HTTP. | Low: older results must not override the latest result. |
| P2 | domain/analytics/dashboard.ts:4,11 | recentConversations, bookingTrend | A four-row dashboard preview policy and chart point ordering reside in domain. The booking total repeats existing domain analytics.totals. | Move dashboard view-model mapping into presentation and reuse the existing domain total. | Low: preserve ordering, deduplication and total semantics. |
| P2 | app/(owner)/page.tsx:48 | DashboardPage | Open-pipeline status predicate duplicates existing domain isOpenInquiry. | Reuse the existing predicate; other simple status counts remain valid presentation mapping. | Low: closed/lost semantics must not change. |
| P2 | components/owner/messages-inbox.tsx:206 | Inbox click handler | Opening a conversation drops the newly added unread query filter. | Preserve unread filter while delegating navigation. | Low: read threads can disappear from the filtered list while remaining open. |
| P2 | components/owner/viewing-schedule.tsx:179,187 | requestedOnly mode | The new requested-only mode ignores the displayed Upcoming/Past selector; the selector changes ordering but cannot perform its advertised filtering. | Hide the inapplicable time selector in all-pending mode; the All viewings link keeps the original time filters available. | Low: dashboard pending count/destination semantics remain all requests. |
| P2 | stores/use-messages-store.ts:201 | receive | A replayed realtime message increments conversation and aggregate unread counts twice. An actual-store replay test reproduced 4 instead of 3. | Suppress duplicate recent event IDs with bounded lifetime-owned storage; retain server unread totals as authoritative on refresh. | Low: preserve optimistic echo merging and clear deduplication on stop. |
| P3 | components/owner/dashboard-insights.tsx:10; components/owner/sparkline-option.ts:1 | insightColors import | Importing a palette also imports ECharts runtime outside the dynamic chart boundary. | Separate lightweight palette from lazy renderer/options. | Low: preserve exact colors/options. |
| P3 | components/owner/shell.tsx:346; app/(owner)/page.tsx:20 | whole-store subscriptions | Shell subscribes to every dashboard field even though it needs only org/listing photos. Dashboard also subscribes to message composer/thread changes it does not render. | Select only consumed state/actions using existing Zustand conventions. | Low: avoid unstable object snapshots. |
| P3 | app/globals.css:384,388 | owner-sidebar-content | Same selector is repeated in the same media block for padding and gap. | Merge declarations; preserve every dimension, breakpoint and cascade. | Very low: screenshot must remain unchanged. |

Five regression tests were added before production refactoring and all five failed for the defects described above. Log: `/private/tmp/wsp-owner-architecture-audit/before-tests.log`. These tests transpile/load the real store source while replacing only the composition-root use cases; they are not alternate store implementations.

## Items inspected and not classified as violations

- DashboardMetric, PanelHeading, date/currency display, retry delegates, accessible drawer behavior, URL presets and component-specific memoization are presentation responsibilities.
- Published/draft counts, unread/new/requested filters and the future-confirmed viewing hint do not authorize a booking or transition a workflow. The existing viewing `isUpcoming` includes a two-hour grace period, so substituting it for a strictly future-confirmed metric would change behavior and is rejected.
- Payment page percent/CSV formatting and total-owing display are derived from server collection values; they do not issue invoices, settle payments or decide eligibility. They existed before this diff and retain their centavo inputs.
- InsightSparkline handles SSR loading/sparse states; InsightChart is the one actual ECharts renderer. These are composition boundaries, not competing renderers. There is one shared gradient definition and no active Nivo sparkline implementation. Retain these boundaries.
- Domain analytics is pure TypeScript. No React, Zustand, ECharts or database import is added to domain/application.
- Existing application use cases remain the orchestration/validation boundary. Stores may call them; a store is not a new domain service.
- Separate dashboard previews and full management-page caches have distinct query shapes. Their mere existence is not evidence of redundant server state. No speculative cache framework is introduced.
- Scoped reduced-motion `!important` rules implement accessibility overrides. Desktop fixed sizes are the user's explicitly restored approved design. No zoom or scale workaround exists; do not redesign them.
- ECharts dependencies/lockfile and Next transpilation are intentional, compatible chart integration changes. Static sample card SVGs and test metrics are not production data.

## Backend authority and security evidence

Read-only inspection confirms `apps/api/src/application/identity/application-authorization.rules.ts` checks OWNER/STAFF capabilities against the requested organization. Collection calls `assertMaySeeMoney`; booking listing/status and owner analytics call `assertMayManageOrganization`. Booking status additionally resolves the booking with `findForOrganization`, rejects unpaid bookings and applies `nextStayState`. Messaging use cases independently check organization/participant access. Frontend route guards do not replace those checks.

No backend policy, SQL, schema, credential or permission change is planned. Client callbacks can still display an already-fetched prior workspace's data unless guarded; that is the confirmed privacy impact. Live backend IDOR/RLS testing has not been performed by the browser fixture suite.

## Review coverage and controlled plan

The inventory contains every initially modified/untracked Owner Web file, including routes, shell, inquiry/messages/viewings components, four stores, all new dashboard/chart modules, tests, documentation, config/lockfile and published assets. Supplied Flutter change-history text is context, not a request to refactor Flutter or execute its pasted shell commands. The asset pack is preserved.

Read the changed hunks and surrounding listing/booking/payment actions and domain policies. Review of the remaining unchanged portions found presentation formatting/delegates rather than new authoritative rules. No automatic split of the existing shell or boards is justified solely by file length. Public SVGs are data-free vector symbols/illustrations; the JPEG is presentation artwork. Documentation's prior compact-layout history is explicitly superseded by the user's restoration request.

Plan: fix the confirmed lifecycle/race problems, relocate only presentation helpers, reuse existing domain functions, remove the eager palette dependency and duplicate CSS selector, repair the two filter interactions, add focused tests, then verify identical dashboard screenshots. Keep deferred network cancellation and unsupported analytics metrics explicit. Results and per-file resolutions will be appended after implementation.

## Completed resolutions

The audit's behavior-preservation requirement applies to legitimate behavior and the approved visual design. Fixes below deliberately correct the reproduced stale-state/replay bugs and the two newly introduced filter defects; no new booking eligibility, financial settlement or authorization rule was added.

| Severity | Current File:Line | Symbol | Finding evidence | Resolution |
| --- | --- | --- | --- | --- |
| P1 | stores/use-messages-store.ts:94,126,167 | stop/open/loadOlder/send/retry | Old pagination and send completions were reproduced before fixes. | Lifetime/thread tokens protect commits, failures and queued subscription callbacks; stop clears private thread/composer/error data. Read acknowledgement uses the current count, avoiding stale subtraction. |
| P1 | stores/use-notifications-store.ts:34,58 | start/stop/markAllRead | Old A response replaced B notifications. | Lifetime guard covers initial load, subscription and mark-read failures; stop clears items/latest/error/open. This adjacent store was added to refactor scope because it is consumed directly by the changed shell. |
| P1 | stores/use-engagement-store.ts:89,154 | stop/move/act | Old mutation failure appeared in a new scope. | Lifetime guards reject obsolete mutations/callbacks; clear private form/selection/error state while keeping UI layout/time-filter preferences. |
| P1 | stores/use-dashboard-store.ts:27; components/owner/shell.tsx:223 | reset/authenticated lifetime cleanup | Financial cache lacked teardown invalidation. | Explicit reset invalidates pending collection/list requests. Existing subscription cleanup resets dashboard, analytics, booking and listing caches. The effect depends on workspace/user identity rather than the scope object's reference, avoiding resets during a same-workspace profile refresh. |
| P1 | stores/use-bookings-store.ts:57,65,105; stores/use-listings-store.ts:49,55,78 | reset/load/select/runAction | Surrounding changed routes consumed unscoped state. | Org/request/selection identity protects responses and actions. Route presentation masks mismatched rows/details immediately; reset clears private state. New guards were added without changing server status decisions or public query arguments. |
| P2 | stores/use-analytics-store.ts:22,26; stores/use-engagement-store.ts:102,118; stores/use-messages-store.ts:103 | reset/load/refresh | A→B→A replay and older same-scope result were reproduced. | Latest-request sequence checks supplement identity; teardown invalidates earlier lifetimes. |
| P2 | components/owner/dashboard-view-model.ts:4,11 | recentConversations/bookingTrend | Preview policy and duplicate aggregation were in domain. | Moved only presentation mapping; booking total delegates to existing `domain/analytics/analytics.ts:totals`. Original untracked domain helper file is removed after all imports/tests moved. No business policy is moved outwards. |
| P2 | app/(owner)/page.tsx:58 | open-pipeline metric | Repeated CLOSED/LOST predicate. | Reuses existing `isOpenInquiry`. Other simple metric filters remain presentation logic. |
| P2 | components/owner/messages-inbox.tsx:206 | conversation navigation | New unread filter disappeared on selection. | Keeps `unread=1` in thread URLs; actual browser interaction verifies this. |
| P2 | components/owner/viewing-schedule.tsx:187 | requested-only view | Existing time selector could not filter this new mode. | Shows all pending requests without an inapplicable time selector; All viewings still exposes the unchanged time filters. Browser verifies both modes. |
| P2 | stores/use-messages-store.ts:233 | receive | Replay test failed before the change. | A maximum of 500 recent event IDs per client lifetime prevents repeated delivery from inflating unread counts. Message content is not duplicated in that set. |
| P3 | components/owner/insight-palette.ts:1; components/owner/dashboard-insights.tsx:10 | palette import boundary | Palette import eagerly reached ECharts runtime. | Lightweight palette module is shared by presentation/tests; ECharts options remain behind the dynamic chart implementation. Gradient options and rendered chart style are unchanged. |
| P3 | components/owner/shell.tsx:353; app/(owner)/page.tsx:24 | subscriptions | Shell subscribed to unrelated financial/error fields; dashboard subscribed to composer/thread updates. | Shell selects org/listing references, dashboard selects only consumed message/engagement state using existing Zustand `useShallow`. |
| P3 | app/globals.css:384 | owner-sidebar-content | Duplicate selector in the same media block. | Combined padding/gap in one declaration. No size, spacing, typography, breakpoint or specificity change. |

## Responsibility map after refactor

| Layer | Actual location / responsibility |
| --- | --- |
| Domain | Existing analytics `totals`, inquiry `isOpenInquiry`/`nextStatuses`, viewing scheduling/action helpers, messaging merge types/rules. Pure TS; no chart/browser/state dependencies. |
| Application | Existing LoadDashboard, LoadBookings, UpdateBookingStatus, MoveInquiry, ViewingAction and messaging/notification use cases orchestrate existing repository/realtime ports and retain existing validation. No new service or workflow state machine. |
| Infrastructure | Existing composition root constructs HTTP/Supabase adapters; DTO schemas parse records; backend asserts ownership/capabilities, applies booking state transitions and computes collection data. Unchanged in this refactor. |
| State | Zustand stores own loading/error state, scoped client caches, optimistic entries, subscriptions and request lifetime checks. They delegate commands to the existing use cases. No independent payment/booking decision added. |
| Presentation | Dashboard components, dashboard-view-model, palette and chart options map accepted data into labels, ordered preview rows and graphs. InsightSparkline owns dynamic/sparse-state presentation; InsightChart is the single ECharts renderer. Route presets and accessibility remain UI responsibilities. |

## Per-file refactor summary

Files below changed during this audit, beyond the already-existing dashboard work. Every original uncommitted source file was preserved in the snapshot before refactoring.

| File under apps/owner-web | Reason |
| --- | --- |
| app/(owner)/page.tsx | Existing inquiry predicate and narrower Zustand selections. |
| app/(owner)/bookings/page.tsx | Mask wrong-organization list/details/errors until the corresponding load completes. |
| app/(owner)/properties/page.tsx | Mask mismatched rows/pending confirmation/errors; keep preset behavior. |
| app/globals.css | Merge one duplicate selector, without visual changes. |
| components/owner/shell.tsx | Auth/workspace lifetime cleanup, stable effect identity and narrower cache subscription. |
| components/owner/dashboard-activity.tsx | Import the relocated presentation helper; JSX unchanged. |
| components/owner/dashboard-insights.tsx | Relocated view-model and lightweight palette imports. |
| components/owner/messages-inbox.tsx | Preserve unread URL filter while selecting a conversation. |
| components/owner/viewing-schedule.tsx | Remove ineffective time selector from all-pending mode. |
| components/owner/dashboard-view-model.ts (new) | Retains original preview/point mapping and reuses domain total. |
| domain/analytics/dashboard.ts (removed after move) | No remaining source imports; view-only policy no longer resides in domain. |
| components/owner/insight-palette.ts (new) | Keeps colors reusable without eagerly importing renderer code. |
| components/owner/sparkline-option.ts | Palette moved out; option function and gradient unchanged. |
| stores/use-analytics-store.ts | Reset and latest-request guard. |
| stores/use-dashboard-store.ts | Explicit private-cache teardown/reset. |
| stores/use-engagement-store.ts | Loader/action/subscription lifetime guards and private state cleanup. |
| stores/use-messages-store.ts | Lifetime/thread guards, cleanup, current unread acknowledgement and bounded recent-event deduplication. |
| stores/use-notifications-store.ts | Adjacent confirmed isolation failure fixed; teardown clears private state. |
| stores/use-bookings-store.ts | Adjacent org/list/detail/action request guards/reset; preserve initial pagination and bucket commands. |
| stores/use-listings-store.ts | Adjacent org/load/action guards/reset; preserve UI status presets. |
| __tests__/helpers/load-store.mjs (new) | Runs actual TS store/use-case modules with only composition dependencies replaced; no alternate production implementation. Uses the already-installed TypeScript compiler. |
| __tests__/store-isolation.test.mjs (new) | Reproduced failures and guarded loading/teardown/pagination/replay scenarios. |
| __tests__/application-boundaries.test.mjs (new) | Tests actual existing orchestration and unchanged command/validation behavior. |
| __tests__/dashboard.test.mjs | Test the relocated helper with the same behavior assertions. |
| __tests__/sparkline.test.mjs; __tests__/fixtures/insight-chart-preview.mjs | Lightweight palette import; assertions and chart style remain unchanged. |
| __tests__/owner-dashboard.browser.mjs | Tests unread/requested-view navigation in addition to existing dashboard regression checks. |
| docs/architecture-audit.md | Baseline findings, evidence, scope, responsibility map, resolutions and results. |

Unchanged during this audit, but reviewed: payments page, inquiry board, metric/icon components, InsightChart/InsightSparkline, Next config, dependencies/lockfile, fixtures/owner-dashboard, and all public assets. Existing entire files were not split solely for line count. Flutter sources, supplied asset pack and all backend files are unchanged.

## Verification results

- Before fixes: five actual-store regression tests failed; an additional actual-store realtime replay test also failed before its fix. Original logs are retained in `/private/tmp/wsp-owner-architecture-audit/`.
- `npm --prefix apps/owner-web test`: **58 passed, 0 failed** (41 existing tests + 14 store regressions + 3 application-boundary tests).
- `npm --prefix apps/owner-web run typecheck`: **passed**.
- `npm --prefix apps/owner-web run lint`: **passed**.
- `npm --prefix apps/owner-web run build`: **passed**.
- `git diff --check`: **passed**.
- Focused backend command: `npm --prefix apps/api test -- src/domain/bookings/__tests__/stay-quote.test.ts src/domain/collection/__tests__/invoice.test.ts src/domain/collection/__tests__/ledger-entry.test.ts src/application/collection/get-owner-collection/__tests__/get-owner-collection.test.ts src/application/identity/resolve-principal/__tests__/resolve-principal.test.ts`: **35 passed across 5 files**.
- Production-browser integration: **passed** at 1590, 1920, 1536, 1440, 1430, 1280, 1024, 768 and 390px widths, no horizontal overflow or page errors. Exercises real rendering, metrics, loading/empty/error/retry states, old-organization delayed requests, booking details, profile/inbox links, correct filter destinations, unread-thread filter retention, both viewing filter modes, notifications, mobile keyboard drawer, signed-out access and ECharts resize/disposal.

Browser reproduction, with the production build running on port3201:

```sh
PLAYWRIGHT_PACKAGE=/private/tmp/wsp-owner-qa/node_modules/playwright node --experimental-strip-types apps/owner-web/__tests__/owner-dashboard.browser.mjs
```

The node store harness compiles the actual source and substitutes application use cases at the composition boundary. API/domain tests exercise actual existing backend functions. Browser service calls use isolated synthetic fixtures, so these results are not live DB/RLS/IDOR certification. No backend security policy was relaxed to make a test pass.

## Visual comparison

Compared the same fixture data before and after this refactor. Desktop geometry is unchanged: 310px sidebar, 153px header, 140px primary metrics at y153, 133px secondary row at y306, 338px activity panels at y452 and 170px insights section at y804. Browser assertions preserve the user's restored 42px desktop greeting. Chart curves, gradient, colors and placement remain the same.

Pixel comparison of the isolated four-color chart preview: **0 changed pixels**. Full dashboard screenshot differences are concentrated in photographic thumbnails and minor rasterized borders: 1.129% of pixels on desktop, 0.712% on the laptop capture and 0.604% on mobile. Overall mean RGB-channel differences are respectively 0.036, 0.0037 and 0.0033 on the 0–255 scale. No new claim of exact screenshot parity is made; screenshots were also inspected visually.

Before/after artifacts and machine-readable comparison results are stored in `/Users/admin/.codex/visualizations/2026/10/20/01a15a68-4cd4-72c1-998a-b1ba93647c0a/owner-dashboard-audit/` (`before-desktop.png`, `after-desktop.png`, laptop/mobile/chart-style pairs and `visual-comparison.json`). Default spacing/zoom and the approved dashboard design are retained.

## Remaining technical debt and limits

- Existing repository ports do not carry cancellation signals for these reads. Late results are invalidated and cannot commit after teardown; HTTP cancellation is deferred to a separate end-to-end port/adapter change rather than silently broadening this refactor.
- The recent-message deduplication set is deliberately bounded to 500 IDs and resets per lifetime. Authoritative unread totals still come from server refresh; this is not a complete historical message ledger.
- Occupancy, property-view history, aligned earnings history and valid comparison periods are still missing from the current analytics contract. No sample metrics or manufactured curves were introduced.
- Existing adapter item DTOs validate records; some outer pagination envelopes use typed casts. No malformed live envelope was observed. Broader envelope hardening is existing infrastructure debt outside the controlled state/presentation changes.
- Browser-local date formatting remains in some older management views, while dashboard previews and viewing scheduling use explicit Manila formatting. No documented period/financial timezone policy was changed in this UI audit.
- Existing Node experimental/type-module warnings and Next's unrelated outside-repository lockfile warning remain; no new lint/type errors remain.
- Other feature editors/stores outside these audited routes were not rewritten or certified. No global proof of all possible client cache lifetimes or live backend authorization is claimed.

The audit is complete for the current uncommitted Owner Web dashboard changes and directly related destination state. No changes were staged or committed, and the supplied Flutter history/asset pack was left intact.
