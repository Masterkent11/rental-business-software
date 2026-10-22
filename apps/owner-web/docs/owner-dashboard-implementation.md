# Owner dashboard initial implementation

Current architecture and lifecycle verification: [controlled-refactor audit](architecture-audit.md).

The later [chart fidelity and compact layout update](dashboard-chart-fidelity.md) supersedes the chart renderer, layout measurements and test totals in this initial report.

## Audit checklist

- Reuse OwnerShell, workspace/route guards, notifications, authenticated session and live subscriptions; keep the agent workspace separate.
- Reuse Photo, LinkBtn, Skeleton, ErrorState, existing repository/use-case/store boundaries, and PHP formatters.
- Reference: `apps/customer_app/assets/WeStayPlace_Gray_Dashboard_Assets/reference/dashboard-gray.png` (1590 × 990).
- Available artwork: header PNG, six standalone gray SVG illustrations and navigation SVG sprite. Keep the supplied asset pack untouched; publish only the files needed by Owner Web. Official brand mark already exists under public/brand.
- Change owner sidebar geometry, owner-only color tokens, header composition, metrics, activity panels and insights surface. Avoid changes to agent pages and global component defaults.
- Available data: organization listings; paginated upcoming bookings; collection month/history; scoped conversations/unread counts; inquiries; viewings; partner analytics with twelve weekly booking counts.
- Gaps: owner occupancy rate, property-view time series, period-specific received earnings and previous-period comparisons are not in the current owner analytics contract. Do not derive them from incomplete preview lists or invoice face values. Render unavailable states. The analytics API supports a fixed twelve-week window; do not advertise unsupported 7/30/90-day filters.
- Fix dashboard request scope and late-response handling so organization changes cannot show stale financial data or message previews.
- Preserve metric filters in destination screens, booking/conversation detail links, notification actions and mobile keyboard navigation.

## Validation

Completed; results and practical limits are recorded below.

## Implemented

The owner workspace now uses the reference sidebar, blended apartment banner, four primary metrics, two secondary metrics, two activity panels and a compact four-column insights surface. Owner styles are scoped to `.owner-workspace`; the existing agent interface keeps its navigation and layout. All dashboard figures use existing API adapters and stores. Sample names and numbers exist only in browser-test fixtures.

Existing components reused: OwnerShell, RouteGuard, workspace selector, authenticated session, live subscriptions, NotificationsButton, BrandMark, Photo, LinkBtn, Skeleton, EmptyState, ErrorState and PHP money formatting. New focused presentation components are DashboardMetric, DashboardIcon, UpcomingStaysPanel, RecentMessagesPanel and OwnerInsights. Domain helpers sort/deduplicate conversation previews and summarize the supplied weekly booking series without mutating inputs.

Workspace changes clear scoped data and ignore late responses. Financial failures show an unavailable state and retry, rather than an invented zero. Direct Payments navigation remains supported. The unused pending-payment dashboard query was removed. Metric destinations preserve published/upcoming/unread/new/requested filters. The mobile drawer supports Escape, focus trapping and focus restoration.

## Files changed

Within `apps/owner-web`:

- `app/(owner)/page.tsx`: dashboard composition and existing scoped data sources.
- `app/globals.css`: owner tokens, reference geometry, responsive layouts, focus and reduced-motion styles.
- `components/owner/shell.tsx`: owner sidebar/workspace/profile composition and drawer accessibility.
- `components/owner/dashboard-{icon,metric,activity,insights}.tsx`: new dashboard presentation components.
- `domain/analytics/dashboard.ts`: conversation preview and booking trend helpers.
- `stores/use-{dashboard,analytics,messages,engagement}-store.ts`: scoped state and stale-response protection.
- `app/(owner)/{properties,bookings,payments}/page.tsx`: dashboard filters and scoped direct collection loading.
- `components/owner/{messages-inbox,inquiry-board,viewing-schedule}.tsx`: owner dashboard filter destinations.
- `__tests__/dashboard.test.mjs`: domain helper tests.
- `__tests__/fixtures/owner-dashboard.mjs`: isolated synthetic API fixtures.
- `__tests__/owner-dashboard.browser.mjs`: real browser rendering and interaction checks with intercepted API responses.
- `public/assets/dashboard/`: web assets listed below.
- `docs/owner-dashboard-implementation.md`: this audit and verification report.

No Flutter source, backend authorization, schema or credentials were changed. The pre-existing untracked gray asset pack was preserved.

## Assets

Reused from `apps/customer_app/assets/WeStayPlace_Gray_Dashboard_Assets`:

- Six SVG illustrations, published at `/assets/dashboard/illustrations/`: published-listings, upcoming-stays, unread-messages, received-this-month, new-inquiries and viewing-requests.
- Navigation sprite, published at `/assets/dashboard/icons.svg`.
- Header photograph, optimized to `/assets/dashboard/owner-header-banner.jpg` and rendered with Next Image.

The existing official `/brand/westayplace-mark.png` remains the brand source. Workspace and booking thumbnails use real listing photos, with a building fallback. The conversation/profile contracts do not expose avatar URLs, so initials are used instead of unrelated sample people.

## Backend integration and metric definitions

All organization requests continue through the existing authenticated HTTP client and repository/use-case boundaries, including the organization header:

| Dashboard content | Existing data source / definition |
| --- | --- |
| Published listings | `GET /organizations/:id/listings`, count state `PUBLISHED` |
| Upcoming stays | `GET /organizations/:id/bookings?bucket=UPCOMING&limit=2`, use server total and server-qualified preview |
| Received this month | `GET /organizations/:id/collection`, `receivedCentavos` for the API calendar month; recorded collections, not booking face values |
| Unread messages / recent conversations | `GET /organizations/:id/conversations`, server unread total, deduplicated latest four non-empty conversations |
| New inquiries | `GET /organizations/:id/inquiries`, status `NEW`; open pipeline excludes `CLOSED`/`LOST` |
| Viewing requests | Existing scoped viewings query (from 30 days ago), status `REQUESTED`; confirmed/upcoming helper uses future scheduled dates |
| Booking insights | `GET /organizations/:id/analytics`, sum and chart of the returned twelve weekly booking counts |
| Notifications | Existing scoped notifications repository and subscription |

Unavailable in the current owner analytics contract: documented occupancy rate, owner property-view series, period-specific received earnings, and previous-period comparisons. These show `—`/unavailable rather than fabricated metrics. The API has a fixed twelve-week series, so the label reads **Last 12 weeks**, with no misleading 30-day selector. Implementing the screenshot's exact analytics values/filter requires backend support for those definitions and periods.

## Visual verification

Reference size: **1590 × 990**. Captured the production build in Chrome with isolated synthetic API fixtures and waited for image decoding. Compared the rendered screenshot twice and adjusted sidebar spacing, illustration sizes, banner fade, secondary-card height and insights text height.

Final measured geometry at the reference viewport:

| Area | Implementation |
| --- | --- |
| Sidebar | 310 px wide, full viewport height |
| Header | x310, y0, height153 |
| Primary metrics | x330, y153, height140 |
| Secondary metrics | x330, y306, height133 |
| Activity panels | x330, y452, height338 |
| Insights | x330, y804, height170 |

Screenshots are saved under `/Users/admin/.codex/visualizations/2026/10/20/01a15a68-4cd4-72c1-998a-b1ba93647c0a/owner-dashboard/`:

- `reference.png`
- `desktop.png`
- `smaller-desktop.png` (1280 × 900)
- `tablet.png` (820 × 1180)
- `mobile.png` (390 × 844)
- `empty.png`

Remaining visual differences: supplied illustrations are recreated vectors rather than exact source artwork; official brand asset and existing font rendering differ slightly; real listing thumbnails and avatar initials vary from the sample; unavailable insight metrics intentionally lack the reference's values, growth labels and curves. The weekly booking chart uses actual points and is not reshaped to imitate sample growth. Exact pixel parity is not claimed.

## Validation results

- `npm --prefix apps/owner-web test`: **39 passed, 0 failed**, including two new tests of the actual domain helpers.
- `npm --prefix apps/owner-web run typecheck`: **passed**.
- `npm --prefix apps/owner-web run lint`: **passed, no warnings**.
- `npm --prefix apps/owner-web run build`: **passed**, all routes compiled/prerendered. Existing warning about `/Users/admin/package-lock.json` outside the repository remains.
- `git diff --check`: **passed**.
- Browser: **passed** at all four viewport sizes, no horizontal overflow or browser page errors. Verified fixture-derived metrics, unique message previews, unavailable analytics, correct card/detail/profile destinations, active navigation, published filter, booking detail opening, inbox/profile navigation, notifications, mobile drawer/Escape, direct Payments load, financial failure/retry, skeletons, empty states, organization switching and delayed old-organization responses. A separate signed-out context requests no organization data and displays sign-in instead of Payments.

Browser reproduction (Playwright installed outside the repository for QA):

```sh
npm --prefix apps/owner-web run build
npm --prefix apps/owner-web run start -- --port 3201
PLAYWRIGHT_PACKAGE=/private/tmp/wsp-owner-qa/node_modules/playwright node apps/owner-web/__tests__/owner-dashboard.browser.mjs
```

The script accepts `PLAYWRIGHT_PACKAGE` for another installation location and `DASHBOARD_SCREENSHOTS` for output location. It requires local public Supabase URL configuration and installed Chrome; no real account credentials are used. Browser fixtures intercept service requests and do not alter production authentication. These checks validate client behavior, not live backend IDOR/RLS enforcement. Existing authorization remains in place; live backend security and real-account data reconciliation were not exercised in this UI task.

The local disk filled during QA. Only generated Next.js caches were removed; the development server was restarted on its existing port3200. No source/user assets were deleted. No dependencies were added to the application or committed lockfiles, and no commit/push was created.
