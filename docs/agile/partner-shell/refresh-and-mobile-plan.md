## Google button refresh defect 2026 11 01

User reported Google sign in disappears on hard refresh. Current GoogleButton starts with false and renders nothing during the provider settings request. The adapter also maps HTTP/network/timeout/parse failures to false, making a transient failure indistinguishable from Google explicitly disabled.

Approved bounded fix: preserve the real provider enabled/disabled decision, render a stable disabled Google action while checking, show recoverable retry feedback on failed checks, and avoid caching an uncertain result as disabled. Reuse existing adapter/port and local Zustand draft pattern. No new identity service, auth permissions, UI redesign, secrets, schema or backend changes.

Acceptance: both Sign In and Sign Up keep a visible loading action on cold/hard refresh; enabled provider enables it; an explicitly disabled provider cannot trigger OAuth; network/HTTP/malformed settings show retry and recover; email sign in remains usable. Verify a real browser reload plus delayed/failed/disabled provider fixtures and existing callback/onboarding regressions. Live Agent Google acceptance remains pending user sign in, not replaced by synthetic tests.

## Shared header and compact mobile follow up 2026 11 01

User approved updated placement: search and notification share one row; current user avatar and name appear beside notifications at top right, with the existing verified seal beside the avatar. Sidebar footer contains only a working Sign out action. Owner and Agent retain separate authorized navigation and static workspace identity.

Scope: reuse shared PartnerToolbar and current session identity; extract a reusable presentation identity link if needed; change existing responsive header rules rather than creating another stylesheet. Mobile shows a compact menu/search/notification/identity row without horizontal overflow; keep search keyboard/results interactions, notification behavior and accessible account access. Account page spacing and long names/emails reflow on small screens. No tenant switching, membership grants, API, migration, SVG replacement or broad CSS refactor.

Acceptance: verify Owner and Agent dashboard and Account at 320/375/834/1440/1920 widths; search/notification/profile vertical centers align, profile links to Account, verified seal stays on avatar, sidebar footer has Sign out only, mobile drawer still works and logout clears the session. Desktop greeting/search remain in one row and mobile greeting uses its own compact readable layout. Use synthetic fixtures for deterministic browser interactions; record actual results and remaining live acceptance separately. Preserve unrelated current auth.css work. Existing Partner Experience November 1–14 sprint assignment and native parent #62 remain unchanged. No push, merge or deployment.
