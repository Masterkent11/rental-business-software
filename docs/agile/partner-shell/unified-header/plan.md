# Unified Owner and Agent header

Registered 2026 11 01 before implementation. Canonical ticket: https://github.com/Masterkent11/rental-business-software/issues/139. Related shell ticket: #64; parent #62. Current sprint remains Partner Experience, November 1–14, 2026. Jira WSP is unavailable; no Jira publication is claimed.

## Approved scope

The latest 1672 × 941 reference supersedes the previous header placement. Reuse OwnerShell and PartnerToolbar for a full width header above the sidebar. Match the 90 pixel desktop header and 284 pixel sidebar alignment. Keep the authorized workspace name plain, without role selection or chevrons. Remove duplicate sidebar branding and workspace card; retain every existing portal navigation destination and Sign out.

Reuse BrandMark, PartnerSearch, NotificationsButton and PartnerVerificationBadge. Refactor PartnerIdentity into an avatar only accessible account menu using the installed Radix dropdown primitive. Account and workspace settings use the existing Account destination; Agent profile remains Agent only. Preserve authentication, membership validation, stores, API scopes and dashboard contents. Add functional Command or Control K search focus, actual unread notification counts, compact mobile layout, keyboard dismissal and contained popups.

## Audit and limits

The shared shell already serves both portals. Existing search supports authorized properties, inquiries, clients, tasks and portal page shortcuts. Booking and viewing page shortcuts exist; direct booking/viewing record search is not implemented by this layout change. No subscription entitlement, billing API, plan field or subscription destination exists in the repository. Do not invent a Pro entitlement or inert billing link. Omit the optional plan slot until authoritative plan data exists; this is an explicit visual difference from the reference. The supplied text ends midway through notification requirements. Use the complete screenshot and supplied objectives for remaining layout decisions.

No Storybook configuration or local dropdown wrapper exists. Reuse the installed radix-ui package without adding dependencies. Existing global, Agent and partner shell styles overlap; consolidate only header and sidebar geometry in partner-shell.css, leaving dashboard business sections unchanged. Preserve unrelated pending auth.css changes and all staged work.

## Acceptance and verification

1. Both portals use one full width header with brand, plain authorized workspace name, scoped search, notifications and avatar only trigger. Sidebar starts below it.
2. No duplicated sidebar identity, workspace selector or hidden role switching control. All existing navigation entries remain.
3. Account menu opens by keyboard and pointer, closes with Escape and outside interaction, restores focus, and navigates to real destinations. Sign out calls the existing session action.
4. Search keyboard navigation, shortcut, loading/error/empty states and tenant request scope remain functional. Notifications use real unread counts.
5. Verify 320, 375, 834, 1440, 1672 and 1920 pixel widths for Owner and Agent; check overflow, geometry, focus, viewport popups and screenshots. Use synthetic browser identities explicitly; do not claim hosted Google Agent acceptance.
6. Run frontend typecheck, lint, unit tests, production build and focused browser regressions. Record actual results separately. No schema change, remote migration, commit, push, merge or deployment.

Status: implementation pending. Visual acceptance and release remain open.

## User compactness correction

Before acceptance, the user requested a smaller natural layout and removal of vertical notification separators. Desktop header is revised to 72 pixels, sidebar to 244 pixels, with smaller brand, search, avatar and navigation spacing. No CSS zoom or transform scaling. This supersedes the initial 90/284 pixel targets; retain mobile touch targets. Registered in ticket #139 before the correction.

## Shared sidebar spacing correction

The user reported touching Agent navigation rows. Remove competing Agent sidebar declarations and centralize row padding, six pixel gaps, section label spacing and content driven row height with a 44 pixel minimum in partner-shell.css. Wrapped labels must expand their row without overlap. Preserve all destinations and active route behavior. Registered in #139 before this correction.
