# Shared header and sidebar verification

Implemented locally on 2026 11 01 under [ticket #139](https://github.com/Masterkent11/rental-business-software/issues/139), with scope and user corrections registered before their code changes. Current sprint: Partner Experience, November 1–14, 2026. Acceptance and hosted release remain open.

## Result

Owner and Agent reuse PartnerToolbar in OwnerShell above the sidebar. Authorized workspace text is plain and truncated with the full title available. Sidebar identity duplication and switch arrows are removed. Every existing Owner and Agent destination remains available.

The user requested compact sizing after the initial reference implementation. The final desktop header is 72 pixels and sidebar 244 pixels. Logo, search, avatar and greeting use native compact dimensions without CSS zoom or transform scaling. Both sides of the notification bell have no vertical separator. Owner and Agent sidebar rows share six pixel gaps, a 44 pixel minimum height, 10 by 14 pixel padding and 14 pixel type. Wrapped labels expand naturally. Competing Agent sidebar declarations were removed from dashboard.css.

PartnerIdentity uses the existing Radix dropdown package, an avatar only trigger and real Account and settings, Agent profile where authorized, and Sign out actions. The verified seal remains attached to the avatar. Pointer and keyboard opening, Escape, focus return, outside dismissal and account navigation were exercised. Search retains its scoped implementation and adds working Command K and Control K focus. Notification counts come from the existing notification store.

## Sources reused and refactored

Reused BrandMark, PartnerSearch, NotificationsButton, PartnerVerificationBadge, navigationFor, session actions and the existing authorized Workspace model. Refactored PartnerToolbar, PartnerIdentity, OwnerShell, DashboardHeader and partner-shell.css. Removed the obsolete dashboard toolbar composition context after moving the single header to shell level. Dashboard business sections, API contracts, membership rules and database schema were preserved.

## Actual checks

- Frontend typecheck and production build passed. Lint completed with zero errors and two existing unused variable warnings in messages-inbox.tsx.
- All 93 frontend unit tests passed, zero skipped.
- Shared shell browser suite passed 30 recorded cases across both portals, at 320, 375, 834, 1364, 1440, 1672 and 1920 pixel widths. It checked header and sidebar geometry, common navigation spacing, notification counts, lack of separators, viewport overflow, popups, keyboard menus, focus return, Command/Control K, scoped search requests, query races, error states, branding persistence and drawer Sign out. Browser errors: zero.
- Authentication, Google reload and Marketing Hub browser regressions passed. Providers and APIs were intercepted with synthetic identities; these are not hosted end to end or database isolation results.
- Visually inspected compact Owner overview at 1364 pixels, Agent Represented Properties spacing and Owner mobile layout. Captures show synthetic data rather than the user's live account.
- git diff --check passed. The original staged diff remains unchanged, SHA256 23f1480b8e7b7cf826b2654db41da947b6a3f78a4209e9d49f05f5890748c22d. Unrelated pending auth.css work was preserved.

Logs and machine readable results are in evidence/. Screenshots are separated from all earlier staged evidence. The marketing regression used a temporary copy of the existing harness with only its helper import and output destination redirected, preserving the original screenshot directory.

## Explicit gaps

The Pro Plan badge is omitted because the repository has no subscription entitlement data source or billing destination. No paid entitlement or fake interaction is fabricated. Search retains existing resource queries and role appropriate page shortcuts; this layout change does not add direct booking or viewing record search. The supplied text ends midway through section 7, so the screenshot and complete supplied objectives govern the rest of the layout.

Jira WSP is not connected; no Jira ticket is claimed. No backend or schema change, remote migration, production data modification, commit, push, merge or deployment was performed. Live Google Agent acceptance remains separate from the synthetic regression evidence.
