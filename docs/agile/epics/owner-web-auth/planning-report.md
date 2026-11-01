# Owner Web authentication Phase 1 report

Recorded 2026-11-01, Asia/Manila. Planning only; no development, commit, push, PR, merge or deployment.

## Delivery status

| GOVERNANCE | EPIC | TICKETS SYNCED | BRANCH/PR | SCREEN MATRIX 8/8 | AUTH E2E | A11Y | SECURITY | TEST RUNS | BLOCKERS | APPROVALS | DEPLOYMENT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gate A closed; Phase 1 honored | #103 open/Blocked | 1 epic + 8 children, native links verified | Existing story-book/agile/31-10-2026; no new branch or PR | 0/8; planned, not implemented | Not run for new flows | Plan complete; acceptance not run | Audit/decisions drafted; review pending | 16 existing tests passed on Node 24.19.0 | Exact assets, approved auth/provisioning flow, provider/redirect/legal/Storybook readiness | Complete-plan owner approval pending | NOT DEPLOYED |

## Findings and evidence

- Existing Owner Web supports real email/password sign-in, /me resolution and owner/agent workspace selection. Signup, OAuth, callback, recovery and legal routes are absent. This redesign adds capabilities requiring explicit contract and security review.
- Preserve the one-account/workspace model and existing backend token/membership checks. Role onboarding selects intent only; it does not authorize an owner organization or verify an agent.
- GitHub Project 3 is the verified canonical tracker; repository ADMIN and project write permission were verified. No Jira source of truth was found. All 92 prior issues remain unchanged in title, body and state.
- Published nine unique open planning records and verified nine native parent links: existing product initiative #12 → auth epic #103 → eight tasks. Project now contains 101 items. No implementation item is Done and no sprint, assignee or accepted story points were invented.
- Existing identity work #14 and #29–#34 is preserved. AUTH-007 references existing Storybook foundation #86–#88; no duplicate setup tickets or installation.
- Byte-identical copies of both auth references are preserved. Source dimensions/hashes and all 23 role-pack files are inventoried. The role scene differs from the auth villa.
- Supported baseline command: Node 24.19.0 --experimental-strip-types --test __tests__/session-lifetime.test.mjs __tests__/partner-portal-domain.test.mjs from apps/owner-web. Exit 0, 16 passed, 0 failed, 0 skipped. This is existing store/domain coverage, not new auth E2E or UI acceptance.

## Actual issue hierarchy

| Planning key | Issue | Native parent | Status |
| --- | --- | --- | --- |
| WSP-AUTH-EPIC-01 | [#103](https://github.com/Masterkent11/rental-business-software/issues/103) | #12 | Blocked |
| AUTH-001 | [#104](https://github.com/Masterkent11/rental-business-software/issues/104) | #103 | In Review |
| AUTH-002 | [#105](https://github.com/Masterkent11/rental-business-software/issues/105) | #103 | Blocked |
| AUTH-003 | [#106](https://github.com/Masterkent11/rental-business-software/issues/106) | #103 | Backlog |
| AUTH-004 | [#107](https://github.com/Masterkent11/rental-business-software/issues/107) | #103 | Backlog |
| AUTH-005 | [#108](https://github.com/Masterkent11/rental-business-software/issues/108) | #103 | Backlog |
| AUTH-006 | [#109](https://github.com/Masterkent11/rental-business-software/issues/109) | #103 | Blocked |
| AUTH-007 | [#110](https://github.com/Masterkent11/rental-business-software/issues/110) | #103 | Blocked |
| AUTH-008 | [#111](https://github.com/Masterkent11/rental-business-software/issues/111) | #103 | In Review |

## Proposed implementation sequence

Audit and assets (AUTH-001/002), then AUTH-006 architecture/provider/provisioning decisions and AUTH-008 explicit Gate A approval. Implement shared presentation and Sign In (AUTH-003), then Sign Up and approved role intent (AUTH-004). Complete viewport verification (AUTH-005), auth-specific Storybook coverage after #86–#88 (AUTH-007), regression/security/accessibility evidence (AUTH-006), and final owner QA/PR acceptance (AUTH-008). Work one ticket at a time, honoring dependencies.

An eventual implementation branch may use codex/owner-auth-103, but no such branch has been created. Reconcile the older local source with approved remote work before implementation. No new backend endpoint, dependency, provider setting or migration is pre-approved.

## Visual fidelity and responsive strategy

Use close-up phone references for detailed form hierarchy, the matrix for the four compositions and the separate role pack for onboarding. Phone and portrait iPad retain full photo/glass layout; laptop and desktop use independently measured white/photo panel proportions. Shared presentation primitives and local auth tokens avoid duplicated forms and dashboard regressions. Exact controls, typography, imagery, spacing and crops require eight actual reviewed screenshots. Device/browser chrome is presentation-only and must not appear inside the app.

Measurements from flattened composites are explicitly approximate. Scroll/safe-area/keyboard/zoom behavior must remain functional even where a static mockup fits differently. Google/recovery/navigation placement differences require documented owner decisions. No pixel-perfect result is claimed during planning.

## Owner decisions and remaining blockers

1. Review and approve this complete plan before development, as required by the supplied Phase 1 instruction.
2. Resolve original auth villa photo, floating-card image/content, exact font/logo and Google artwork, or explicitly approve limited substitutes. User confirmed composite-only availability; that does not waive exact-match requirements.
3. Approve owner membership/provisioning behavior and the role-intent sequence/missing mobile and later role steps. Existing code has agent setup but no identified public owner organization creation contract.
4. Approve Google/social scope, desktop placement, confirmation/recovery/callback/session architecture and actual legal content. Verify intended hosted provider/SMTP/redirect configuration in a separately approved test phase.
5. Complete/reuse the existing planned Storybook foundation before auth stories. Keep auth E2E, visual matrix, accessibility/security acceptance and release review as future evidence, not Done claims.

## QA contract

Eight default route/viewport screenshots, plus focus/invalid/busy/error/provider states. Additional 320×568, 390×844, 768×1024, 1024×768, 320px reflow, 200% zoom, safe areas and on-screen keyboard checks. Test credentials, actual confirmation/recovery/OAuth where approved, malicious redirects, old/invalid callbacks, workspace selection, cross-org denial and logout races. Deterministic fixtures and actual controlled-provider runs are reported separately. See qa-plan.md for the full walkthroughs and repository checks.

## Exact new files from this planning phase

All additions are inside this package; prior untracked Agile tooling and supplied assets are preserved. No tracked production/configuration/dependency file has a diff and nothing is staged.

- docs/agile/epics/owner-web-auth/README.md
- docs/agile/epics/owner-web-auth/approval-gate.md
- docs/agile/epics/owner-web-auth/asset-register.json
- docs/agile/epics/owner-web-auth/asset-register.md
- docs/agile/epics/owner-web-auth/assets/auth-mobile-reference.png
- docs/agile/epics/owner-web-auth/assets/auth-responsive-matrix.png
- docs/agile/epics/owner-web-auth/audit.md
- docs/agile/epics/owner-web-auth/auth-decisions.md
- docs/agile/epics/owner-web-auth/dependencies-and-risks.md
- docs/agile/epics/owner-web-auth/epic-and-tickets.md
- docs/agile/epics/owner-web-auth/planning-report.md
- docs/agile/epics/owner-web-auth/qa-plan.md
- docs/agile/epics/owner-web-auth/route-contract-inventory.md
- docs/agile/epics/owner-web-auth/ticket-import/README.md
- docs/agile/epics/owner-web-auth/ticket-import/github-mapping.json
- docs/agile/epics/owner-web-auth/ticket-import/issue-manifest.json
- docs/agile/epics/owner-web-auth/ticket-import/tracker-audit.json
- docs/agile/epics/owner-web-auth/ticket-import/verification.json
- docs/agile/epics/owner-web-auth/visual-differences.md
- docs/agile/epics/owner-web-auth/visual-spec.md

## Review entry points

[Planning index](README.md), [audit](audit.md), [visual specification](visual-spec.md), [assets](asset-register.md), [complete tickets](epic-and-tickets.md), [QA](qa-plan.md), [decisions](auth-decisions.md), [approval gate](approval-gate.md), [live mapping](ticket-import/README.md).

[Existing Project 3](https://github.com/users/Masterkent11/projects/3) and [auth epic #103](https://github.com/Masterkent11/rental-business-software/issues/103).

**AWAITING OWNER APPROVAL — NO DEVELOPMENT STARTED.**
