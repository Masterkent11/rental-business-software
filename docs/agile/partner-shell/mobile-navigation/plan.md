# Mobile partner navigation plan

Registered 2026 11 01 before product changes. Existing work is reconciled to #64 (dashboard and shared navigation, parent #62) and #139 (responsive scoped search). Both are already in GitHub Project 3, Partner Experience, November 1–14, 2026. No duplicate Epic or eight duplicate provisional tickets. Jira WSP is not connected. No PR exists for these uncommitted changes; no push is authorized.

## Audit and reference

The supplied mobile reference is codex-clipboard-a70e3704-46f6-49ba-b885-ead46d87b587.png. Reuse OwnerShell, PartnerToolbar, PartnerIdentity, PartnerSearch, existing Dialog primitives, DashboardMetric, AgentDashboardView, SVG sprite and Agent assets. The existing drawer uses the validated workspace navigation and session drawer flag. There is no bottom dock or narrow search overlay. Tailwind default breakpoints remain; scope the dock to phones up to 600 pixels, retaining the existing tablet drawer and desktop sidebar. No Storybook is configured.

## Workstream reconciliation

| Provisional item | Canonical ticket | Scope and dependency |
| --- | --- | --- |
| MOB001 | #64 | Capture current Owner and Agent viewports before product edits |
| MOB002 | #64 | Shared floating dock presentation, after baseline |
| MOB003 | #64 | Agent Dashboard, Leads, Clients, Viewings and More |
| MOB004 | #64 | Owner Dashboard, Properties, Bookings, Messages and More |
| MOB005 | #139 | Narrow screen search overlay using existing scoped search |
| MOB006 | #64 | Two column phone metrics, fifth Agent card full width |
| MOB007 | #64 and #139 | Touch targets, keyboard, drawer, safe areas, content clearance |
| MOB008 | #64 | Responsive screenshots, regression and review evidence |

As a partner, I can reach my authorized frequent destinations with one hand while preserving real dashboard data. Owner frequent destinations follow its existing inventory, stay and messaging workflow; all other routes remain in More. Domain navigation selects existing role specific destinations; the dock does not create authority. Desktop navigation and composition must remain unchanged.

## Acceptance and subtasks

Capture baseline layouts at 320×568, 375×812, 390×844, 430×932, 834×1112, 1440×900 and 1920×1080 for both roles. Add a reusable icon only floating pill dock with accessible labels, actual route based active states and More using the existing drawer. Add one native SVG grid symbol for More because the approved icon collection has no More asset; preserve every existing metric and navigation asset. Provide a solid fallback for unsupported blur or reduced transparency. Add safe area viewport support without disabling user zoom and enough content bottom clearance. Keep the dock phone only and hide it after sign out/session loss.

At narrow widths below 360 pixels show a 44 pixel Search action opening the existing Dialog primitive with actual PartnerSearch. Wider phones retain the inline search. Search overlay must trap focus, close on Escape/outside/selection and restore focus. Preserve Command/Control K and never focus a hidden input. All header and dock actions have at least 44 pixel touch targets.

For phone Agent metrics retain existing labels, values, hints, links and SVGs. Use compact two columns, last full width, and preserve every activity/pipeline/inquiry/response section. Keep Owner metrics and desktop business content unchanged.

## Walkthrough and definition of done

Sign in as synthetic Owner and Agent; tap all dock links, use Back/Forward, repeat the active link, open More and the header drawer, navigate extra routes, use narrow search and keyboard results, notifications and account menu. Check actual route highlighting, no opposite portal links, session expiry/sign out hiding, reduced motion/transparency, scroll clearance and safe area calculations. Compare updated screenshots to baseline, verify desktop geometry and pixels unchanged, run typecheck/lint/unit/build and browser regressions. Record actual evidence, not assumed passes. Keep visual acceptance and release open. No backend, database, authorization, billing or deployment changes; no comments added to source.

## Expanded mobile screen feedback

User supplied thirteen additional current screenshots before acceptance. Extend the mobile pass to Properties actions/status tabs/search and view controls/property rows/pagination, Bookings tabs and empty state, Messages inbox and full viewport active conversation/composer, Analytics two column summary/chart spacing, branded mobile drawer, centered loading state, and compact immersive Tour Studio controls/room forms. Preserve existing data and operations and desktop styles. Hide the global header and dock while an active phone conversation occupies the viewport. Keep the real back action and keyboard aware composer visible. Do not fabricate Matterport dollhouse/3D geometry: existing data supports equirectangular 360 views and hotspots, not a 3D building model.

Reconcile to existing #25 Properties (parent #23), #67 messaging (parent #65), #73 tours (parent #71), #64 shared dashboard/analytics/drawer and #139 compact header. Reuse existing issues and active Partner Experience sprint, without duplicate Epics. Each mobile walkthrough covers 320, 375, 390 and 430 pixel widths, keyboard/touch, real existing actions under synthetic test responses, and desktop regression. UI changes only; no backend, schema, authorization, billing or production change. Keep review and hosted acceptance open.
