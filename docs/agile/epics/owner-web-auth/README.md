# Owner Web authentication

Current state: local implementation under review following subsequent user instructions. See [implementation report](implementation-report.md), [current review gate](approval-gate.md) and [latest visual reconciliation](visual-differences.md). The Phase 1 text below is a historical planning snapshot. No push or deployment.

## Original planning snapshot

Planning recorded on 2026-11-01, Asia/Manila, against local commit `9b5689c2d0a0a0079dad83e92ad838d8f708cf65` on `story-book/agile/31-10-2026`.

## Scope and authority

This package plans the Owner Web Sign In and Sign Up redesign against the two supplied composite mockups. The supplied role selection pack defines the additional owner/agent onboarding reference. The user explicitly requires a 1:1 visual match and confirmed that only composite authentication mockups are currently available; missing source assets must be listed in this plan.

The supplied Phase 1 document states: **DO NOT START DEVELOPMENT** and requires explicit owner approval after reviewing the complete plan. The accompanying implementation prompt also requires Gate A before product changes. This request does not open that gate. Product code, CSS, configuration, dependencies, provider settings and schemas remain unchanged. No commit, push, merge, PR or deployment is performed in this phase.

## Review package

- [Audit and governance evidence](audit.md)
- [Existing routes and contracts](route-contract-inventory.md)
- [Epic and eight ticket specifications](epic-and-tickets.md)
- [Visual contract and measurements](visual-spec.md)
- [Asset register](asset-register.md)
- [Proposed authentication decisions](auth-decisions.md)
- [QA and acceptance plan](qa-plan.md)
- [Dependencies and risks](dependencies-and-risks.md)
- [Approval gate](approval-gate.md)
- [Visual differences register](visual-differences.md)
- [Exact issue payloads](ticket-import/issue-manifest.json)
- [Live issue mapping](ticket-import/github-mapping.json), when synchronization succeeds
- [Planning execution report](planning-report.md)

## Tracker

Use [the existing GitHub Project 3](https://github.com/users/Masterkent11/projects/3) in [Masterkent11/rental-business-software](https://github.com/Masterkent11/rental-business-software). There is no verified Jira WSP project or Jira configuration in the audited repository. Do not create a second tracker. Provisional AUTH identifiers are retained as stable planning keys; actual GitHub issue numbers are recorded separately.

## Proposed execution sequence after approval

1. Review AUTH-001 audit, AUTH-002 exact assets and visual measurements, and AUTH-008 approval record.
2. Resolve AUTH-006 decisions about registration, provisioning, session/callback architecture, recovery and provider configuration before their implementation. A UI redesign does not authorize new privileged membership rules.
3. Implement AUTH-003 Sign In with shared presentation components and existing session behavior.
4. Implement AUTH-004 Sign Up and the approved role intent flow using approved contracts. Do not grant authority from role selection.
5. Verify AUTH-005 responsive composition and eight required screenshots; run AUTH-006 functional, accessibility and security regressions.
6. Complete AUTH-007 auth stories using the existing planned Storybook foundation tickets, then AUTH-008 acceptance and PR review.

Work one ticket at a time along these dependencies. Story Points are proposals in ticket bodies, not team commitments. No iteration, developer assignment or historical completion date is invented.

Historical Phase 1 status: awaiting approval before the subsequent implementation instruction. Current status is recorded above.
