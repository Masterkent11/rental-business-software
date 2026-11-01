# Agent overview and tenant isolation

## Agent overview fidelity and tenant isolation change

Requested 2026 11 01. Scope is Agent overview visual implementation and partner tenant isolation, documented before product edits. This does not create Super Admin or grant cross tenant monitoring rights.

Business rule: Owner A cannot access Owner B organizations; Agent A cannot access Agent B private workspace. Authorized representation grants only its existing bounded listing permissions, never Owner dashboard access. A workspace selector displays only memberships/profiles returned for the authenticated account. Multiple genuine capabilities on one account are not equivalent to sharing accounts or data. No role, user ID or organization ID supplied by the browser creates authority.

AC 01: Agent overview matches the supplied composition: existing Owner city/living room header, greeting, five metrics, activities/pipeline and latest inquiries/response panels. Preserve actual API data, loading, error and populated states. No fabricated metrics.
AC 02: New inquiries, active clients, viewings, follow ups, deals, response and no activity artwork use scalable path based SVGs in the existing Owner blue gray palette; no bitmap embedded in SVG. Reference is a raster, so exact source vector fidelity remains subject to visual acceptance.
AC 03: Agent and Owner routes guard mismatched workspace kinds. Workspace choices contain only authenticated memberships and actual Agent profile; foreign organization keys cannot be selected.
AC 04: All Agent private state clears synchronously on logout, account or workspace change. In flight reads and mutations cannot repopulate the next session. Dashboard reads require actual AGENT capability and profile, and never accept a target Agent user ID.
AC 05: Verify positive data and negative Owner A/B, Agent A/B, forged organization selection, direct route, logout/account change and late response scenarios. Preserve existing representation permissions. Super Admin monitoring is separate future work.
AC 06: Typecheck/lint/tests plus responsive browser captures at 375x812, 834x1112, 1440x900, 1920x1080. Attach limitations and results before acceptance. No remote migration, push or deployment.

Implementation boundaries: reuse existing session and workspace domain, dashboard metric/header assets, API principal and scoped repositories. No new auth store or duplicate dashboard API. Related #62/#63 and role intent #113 remain separate.
