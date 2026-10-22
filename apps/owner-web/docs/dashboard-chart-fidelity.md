# Dashboard chart fidelity and layout scaling

Current architecture and lifecycle verification: [controlled-refactor audit](architecture-audit.md).

Updated 22 October 2026 (Asia/Manila).

**Current layout:** At the user’s request, the compact sizing changes were reverted. Desktop sizing is restored to the earlier 310px sidebar, 42px greeting, original card illustrations/padding and original responsive breakpoints. ECharts graph styling and lifecycle improvements remain. The compact-layout discussion below records the previous iteration. The restored default layout passed the production build, lint and browser checks, including the original 310px sidebar and 42px greeting assertions. The latest screenshot is `restored-default-layout.png` in the artifact directory below.

The Owner Insights graph renderer now uses Apache ECharts 6.1.0 and echarts-for-react 3.0.6. The PNG at `apps/customer_app/assets/WeStayPlace_Gray_Dashboard_Assets/source/imagegen-graph-style-reference.png` was inspected directly as the style reference. The implementation recreates the styling with chronological data rather than displaying the PNG or the sample-value card SVGs as production charts.

## Changes

- Replaced the earlier fixed-size Nivo sparkline with an SSR-safe, dynamically loaded ECharts client component.
- Registered only LineChart, GridComponent and SVGRenderer. Shared options use 0.45 smoothing, monotone X interpolation, a rounded 2px stroke and a vertical gradient fading from 48% opacity through 20% to transparent. Axes, grids, markers, legends and interaction overlays are absent.
- Charts sit at the lower right of their cards, with a bounded 60px height, 44% width and 140px maximum width. Mobile charts use a compact 78 × 32px surface. The wrapper observes container changes and disposes chart instances on unmount; these paths were exercised in browser checks.
- Disabled chart animation, including for reduced-motion users. Memoized the analytics-derived series and chart options.
- Preserved real values, chronological sorting, loading, error/retry and zero states. Empty histories show “No trend yet”; a single period shows a readable “One period” note rather than an invented curve.
- Added ECharts/zrender to Next's existing package transpilation configuration. Package versions and the application lockfile are updated; existing Nivo dependencies were retained.

Implementation follows the libraries' [modular import guide](https://echarts.apache.org/handbook/en/basics/import/) and [React wrapper API](https://github.com/hustcc/echarts-for-react).

## Earlier compact layout (reverted at the user’s request)

No dashboard-root zoom or transform scaling was found. The previous CSS applied the large desktop treatment above 1399px: a 310px sidebar, 42px greeting, 80 × 96px illustrations and 36px metric values. Around the supplied laptop viewport, the remaining card text widths caused supporting labels to wrap, expanding the metric row beyond its intended height. The sidebar's fixed vertical rhythm also needed scrolling on shorter screens.

The compact desktop breakpoint now covers 1200–1599px: 260px sidebar, 34px greeting, 28px metric values, smaller illustrations and padding. Short desktop viewports up to 900px high use 36px navigation rows, a 132px header, 120px primary metrics and 106px secondary metrics. Larger screens use a fluid sidebar capped at 290px. Tablets below 1200px use the existing drawer with owner-specific visibility rules. Subtitle wrapping, booking status placement and responsive chart bounds were corrected without scaling the page.

At 1430 × 778 CSS pixels, the primary row is now 120px high and all eleven navigation destinations fit the compact sidebar. The full dashboard scrolls normally when its content exceeds the viewport. No CSS zoom, dashboard-root transform or browser zoom changes were introduced.

## Data limits

The existing analytics contract still supplies only twelve weekly booking counts. The live booking chart uses those returned values; zero periods remain zero, so its shape can differ substantially from the illustrative rising curve. Occupancy history, period-aligned received earnings, property-view history and valid comparison percentages remain unavailable. Their cards keep the honest unavailable state. The period remains “Last 12 weeks”; no unsupported 30-day filter was added.

All four reference color treatments were visually checked through an isolated test fixture using the same production chart configuration and the real ECharts SVG renderer. That preview is clearly labelled synthetic data and is not a product route or production data source. Completing all four live charts requires the missing backend histories and business definitions.

## Files in this update

Paths are relative to `apps/owner-web`:

- `components/owner/insight-sparkline.tsx`: reusable dynamic client boundary and sparse-data states.
- `components/owner/insight-chart.tsx`: modular ECharts React renderer and responsive lifecycle.
- `components/owner/sparkline-option.ts`: centralized colors and shared chart options.
- `components/owner/dashboard-insights.tsx`: stable live series and chart wiring.
- `components/owner/dashboard-icon.tsx`: reference information icon support from the earlier chart refinement.
- `components/owner/shell.tsx`: owner tablet header visibility.
- `app/globals.css`: compact sizing, breakpoints and chart placement.
- `next.config.ts`, `package.json`, `package-lock.json`: requested chart dependencies and compatibility configuration.
- `__tests__/sparkline.test.mjs`: actual ECharts option/renderer checks for four colors, smooth curves, gradients and zero/sparse inputs.
- `__tests__/fixtures/insight-chart-preview.mjs`: explicitly synthetic style-validation series, outside production.
- `__tests__/owner-dashboard.browser.mjs`: expanded responsive, chart, error and cleanup checks.

No backend contracts, authorization, Flutter source, user asset pack or production metrics were changed.

## Validation

| Check | Result |
| --- | --- |
| `npm --prefix apps/owner-web run typecheck` | Passed |
| `npm --prefix apps/owner-web run lint` | Passed, no lint warnings |
| `npm --prefix apps/owner-web test` | 41 passed, 0 failed |
| `npm --prefix apps/owner-web run build` | Passed |
| `git diff --check` | Passed |
| Production browser checks | Passed, no page exceptions or hydration errors |

Browser checks cover 1590 × 990, 1920 × 1080, 1536 × 864, 1440 × 800, 1430 × 778, 1280 × 800, 1024 × 768, 768 × 1024 and 390 × 844. Every viewport has no horizontal overflow. Tests also check live values, gradients/curves, SVG width after container resizing, chart instance disposal after navigation, financial and analytics error/retry, single-period/empty/zero histories, loading skeletons, workspace changes and late responses, signed-out access, notifications, mobile drawer, booking details and destination links.

Browser reproduction, with the production server running on port3201:

```sh
PLAYWRIGHT_PACKAGE=/private/tmp/wsp-owner-qa/node_modules/playwright node --experimental-strip-types apps/owner-web/__tests__/owner-dashboard.browser.mjs
```

These integration checks intercept HTTP with synthetic fixtures and validate the real browser application. They do not certify live backend authorization or reconcile a real owner's accounts. Existing Node module/type-stripping warnings and Next's outside-repository package-lock warning remain separate from the successful checks.

## Visual evidence

Screenshots were inspected after rendering and layout settling. Artifacts are saved at:

`/Users/admin/.codex/visualizations/2026/10/20/01a15a68-4cd4-72c1-998a-b1ba93647c0a/owner-dashboard-charts/`

- `before-desktop.png`: previous implementation at 1590 × 990.
- `desktop.png`: updated dashboard at 1590 × 990.
- `laptop-retina-equivalent.png`: compact layout at 1430 × 778 CSS pixels.
- `chart-styles.png`: all four colors/gradient treatments with explicitly labelled synthetic style data.
- Additional screenshots for every supported viewport and empty states.

The chart styling follows the reference, but exact pixel parity is not claimed. Real chronological values determine the curve shape; missing histories remain unavailable. The supplied PNG's raster texture is not recreated as chart glow or noise.
