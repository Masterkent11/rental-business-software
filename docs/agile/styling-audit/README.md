# Westayplace styling audit

Date: November 1, 2026. Status: audit draft paused at the user’s request; refactor not started. This task did not edit product styling, business logic, security rules or database. A concurrent modification to auth.css was detected afterward and preserved; refresh the baseline before resuming. New files in this directory are audit evidence and unpublished planning artifacts.

## Recommendation

Keep the established Tailwind v4 setup, semantic tokens and existing UI primitives. Start with a small presentation slice in partner search and Marketing Hub summary content. Preserve the dashboard header geometry, sidebar dimensions, artwork, SVGs and authentication styles. Do not migrate whole stylesheets or create another design system.

The application already uses Tailwind. Plain CSS is not inherently a defect. The main maintenance problem is straightforward component presentation added as globally imported selectors, combined with overlapping styles across files. A blind replacement with utility classes can change the cascade and the approved UI.

## Audit boundary and provenance

The audited tree is branch `codex/agent-marketing-phase-one`, based on HEAD `9b5689c2d0a0a0079dad83e92ad838d8f708cf65`, with substantial existing staged work. HEAD alone is not the visual baseline. The working tree at build time is the baseline, including approved header search and verification beside the avatar. A later concurrent auth.css change means these captures are not the newest auth styling baseline.

The initial index contained 416 changed files. The audit did not stage, unstage, reset, commit or push them. See [preservation evidence](evidence/preservation.json) for index and source fingerprint verification. Generated build output and the dedicated local QA server do not change application source.

`git show HEAD:<path>`, semantic declaration comparison, component imports and literal source consumers were inspected. Four stylesheet additions are absent from HEAD. This establishes staged provenance, not who authored them or when. The large line count change in `globals.css` includes formatting; added lines must not be mistaken for equivalent new semantic CSS.

## Existing authoritative conventions

| Concern | Existing implementation | Decision |
| --- | --- | --- |
| Tailwind | Installed and locked Tailwind 4.3.3, `@tailwindcss/postcss` 4.3.3 | Reuse; no installation or upgrade |
| Configuration | [PostCSS](../../../apps/owner-web/postcss.config.mjs), CSS first `@theme inline` in [globals.css](../../../apps/owner-web/app/globals.css), [components.json](../../../apps/owner-web/components.json) | Extend these sources only |
| Semantic palette | Root surface, foreground, muted, border, focus and status variables; approved `.owner-workspace` overrides | Preserve actual runtime scopes and values |
| Typography | Theme font aliases; `text-display`, `text-display-sm`, `text-title`, `text-amount`, `label-caps`, `tabular`; exact utility sizes in components | Reuse when the entire recipe matches |
| UI primitives | [Owner UI](../../../apps/owner-web/components/owner/ui.tsx): buttons, links, fields, inputs, cards, badges, dialogs, empty/error/loading states and tabs | Prefer existing primitives for new compatible presentation |
| Other primitives | Existing shadcn/Radix/CVA components under `components/ui`, HeroUI styles and `cn` using clsx plus tailwind-merge | Keep established integrations; do not merge unlike variants |
| Specialized styling | Photography, masks, scrims, responsive compositions, artwork and SVG | Retain justified CSS |
| CSS Modules | None found in the application source inventory | No module migration proposed |
| Monorepo tooling | No root `package.json`; application manifests plus separate tools tooling | Run application commands from the existing app; do not introduce a root toolchain |

Owner `Btn` defaults to a 40px height and 13.5px type. The shadcn button default uses a different size recipe. These are not visually interchangeable. `Card` and `SegmentedTabs` also cannot replace dashboard panels or marketing tabs without comparing dimensions, borders, states and typography.

Authentication uses a deliberate SF Pro/system font stack. Replacing it with the global `font-sans` alias could change fallback rendering. Authentication typography, role selection solid surfaces, mobile form effects and image crops remain unchanged.

## Stylesheet inventory

[Rule inventory](rule-inventory.json) contains every rule and at-rule in these five files, source lines, declarations, source consumers, provenance, token matches and overlapping risk flags. It is a static triage map, not a deletion list.

| File | Lines | Style rules | At-rules | Primary assessment |
| --- | ---: | ---: | ---: | --- |
| `app/globals.css` | 2009 | 301 | 27 | Established foundation and approved portal compositions; some stale selectors |
| `components/agent/dashboard.css` | 398 | 91 | 3 | Mostly justified Agent composition, with shared shell overrides and stale descendants |
| `components/auth/auth.css` | 1320 | 250 | 9 | Deliberate responsive authentication composition and visual effects |
| `components/marketing/marketing.css` | 393 | 75 | 2 | Many straightforward text, flex, grid and spacing rules can use utilities |
| `components/owner/partner-shell.css` | 406 | 60 | 6 | Utility candidates in leaf elements; header overrides require careful ownership review |

There are 777 style rules and 47 at-rules, totaling 824 records. Primary triage categories are 271 existing and valid, 63 shared foundations or structural at-rules, 365 component specific and justified, 117 potential Tailwind duplication, and 8 stale selector blocks. A structural media wrapper is counted separately from the rules it contains.

Overlapping flags identify 45 rules with exact existing token value matches and 54 potential global override rules. These counts overlap the primary categories. The 117 utility candidates include legitimate layouts: they are candidates for inspection, not 117 proven defects. Complex compositions often contain simple declarations that should stay together until ownership and computed style equivalence are established.

### Main maintenance findings

1. **Global component styles have broad reach.** Importing a stylesheet inside a component does not make it scoped. `partner-shell.css`, `marketing.css`, `dashboard.css` and `auth.css` are global. Prefixes reduce collisions but do not provide module isolation.
2. **Cascade layer precedence matters.** Many custom rules are unlayered; Tailwind utilities are layered. Remaining unlayered rules can override a newly added utility even when the utility appears more specific. Move complete leaf ownership, including its state/media declarations, or leave it alone. Do not compensate with `!important`.
3. **Header styles are split across files.** Base dashboard styles, Agent overrides and integrated partner header rules all affect the same elements. Keep the approved absolute search position and responsive geometry intact in the first slice. Do not flatten these rules as a cosmetic cleanup.
4. **Agent CSS has duplicate import ownership.** `dashboard.css` is imported in both shared `shell.tsx` and Agent `dashboard-view.tsx`. This is redundant source ownership; it does not prove the bundler ships the CSS twice. Consolidate only after route entry and navigation order testing, in a separate small change.
5. **New leaf presentation duplicates utilities.** Search summary/error text and marketing summary children use basic flex, typography and spacing declarations already expressible with the installed Tailwind version. They are better first targets than the dashboard composition.
6. **Token matches are not always semantic matches.** Equal white colors can reuse the existing surface within the same scope. Similar blues and different status colors must not be merged merely because they look close. Root aliases, Owner overrides and auth local variables must remain scoped.

## Confirmed redundant and stale rules

No deletion has been performed. Source inspection plus synthetic browser DOM inspection supports the following candidates. The DOM evidence covers the captured Owner/Agent dashboard, open search and Account states; it is not proof about every possible future dynamic state.

| File and line | Selector or declaration | Evidence and proposed action |
| --- | --- | --- |
| `partner-shell.css:144` | `.workspace-choice-single { min-width: 0 }` | Same declaration exists in `globals.css:1986`, alongside `flex: 1`; remove this duplicate after approving the bounded diff |
| `globals.css:322` | `.owner-workspace-selector p:first-child, ... select` | Current identity emits `strong`/`small`, not these descendants |
| `globals.css:328` | `.owner-workspace-selector p:last-child, ... label > span:last-child` | Current identity has no matching label/p descendants |
| `globals.css:333` | `.owner-workspace-image` | No current production source consumer; logo rendering uses `partner-logo` |
| `globals.css:419` | `.owner-workspace .fixed.right-6.top-4 > div` | Legacy floating toolbar structure is absent |
| `globals.css:1096` | `.owner-workspace .fixed.right-6.top-4` | Same removed toolbar structure, responsive block |
| `agent/dashboard.css:26` | `.agent-workspace .agent-workspace-avatar` | No current production class consumer |
| `agent/dashboard.css:31` | Agent `owner-workspace-selector p:first-child, ... select` | Legacy descendants absent from current workspace identity |
| `agent/dashboard.css:35` | Agent `owner-workspace-selector p:last-child, ... label > span:last-child` | Legacy descendants absent from current workspace identity |

Other records with no literal consumer are **not** automatically unused. Dynamic classes, third party markup and descendant selectors require separate inspection. The full inventory explicitly keeps `canDeleteWithoutReview` false.

## Token consolidation candidates

Reuse existing tokens first. Add a token only for a repeated semantic value whose consumers share scope. Do not build a second token file or export a replacement palette.

| Foundation | Existing value or recipe | Proposed handling |
| --- | --- | --- |
| Base font family | Existing theme font alias and auth system stack | Preserve both intentional scopes; no global font replacement |
| Display/page/section type | Existing display/title utilities; approved dashboard and auth recipes | Use matching recipes only; do not normalize 44px dashboard headings into 34px shared display |
| Body/label/caption/metric type | Existing exact utilities and component recipes, including weights 600 and 650 | Preserve size, weight, line height and tracking together; add a shared recipe only when multiple complete consumers match |
| Surfaces | `--surface`, `--background`, `--border`, `--muted`, Owner palette | Replace exact compatible literals only; review inherited scope |
| Auth muted text | Existing `--auth-muted: #657b9e` matches two literal declarations | Safe candidate inside auth scope, deferred from the first slice |
| Partner search ink | Repeated `#0c2146` | Candidate `--partner-search-foreground` in the existing Owner token scope; distinct from `--owner-navy: #081e46` |
| Partner search border | Repeated `#d9e3f0` | Candidate `--partner-search-border` in the same source; preserve exact value |
| Partner search focus | `#456aa9` used by search focus and search targets | Candidate `--partner-search-focus`; do not replace with root `--focus: #2563eb` |
| Spacing/layout | Existing Tailwind scale plus exact 9px/15px/17px values and composed breakpoints | Prefer exact utilities for leaf spacing, arbitrary values where required; do not round to nearby scale values |
| Sidebar/header dimensions | Owner 310px, Agent 308px and 264px at its narrower desktop breakpoint; integrated header 171px desktop and distinct mobile heights | Preserve differences; no shared dimension token until repeated consumers justify it |
| Surface radius | `--radius` and `--owner-radius: 14px`, plus intentional 10px/12px leaf radii | Reuse exact matches only; do not replace a 12px search radius with 14px |
| Shadows/borders/transitions | Existing `lift`, focusable and primitive state recipes; search popup has its own shadow | Preserve specialized shadow; only extract genuinely repeated complete recipes |
| Status/interaction colors | Owner success, auth ink, marketing warning/delete colors and blue verification seal | Keep distinct values; verification seal remains `#1877f2`, not Owner link blue |

The minimal token change is at most three search variables appended to the existing `.owner-workspace` token block, plus exact token reuse in approved leaf styles. This small shared stylesheet edit still requires the requested approval. No token additions have been made.

## Proposed implementation sequence

### First slice after approval

1. Reconcile the unpublished STYLE drafts with Jira and GitHub immediately before publication. Reuse any exact match discovered then. Register the bounded maintenance work under the existing delivery Epic, not a new Epic.
2. Extend only the existing token block if the three repeated search values are retained as semantic tokens. Preserve every resolved value and inheritance boundary.
3. Move search summary/error/kind and marketing summary child presentation to exact Tailwind classes at their current consumers. Inspect all selector consumers and their state/media overrides before removing the corresponding declarations. Preserve semantic elements, ARIA attributes, callbacks and data flow.
4. Remove the one duplicate `.workspace-choice-single` declaration. Remove the eight stale blocks only as a separately reviewed deletion diff. Leave unrelated whitespace and rules untouched.
5. Add styling governance outside the generated Next.js block in app `AGENTS.md`, and a narrow check using the existing architecture test/CI path. Record exceptions in documentation, not source comments.
6. Rebuild, run checks and capture matching after evidence. Compare computed styles, geometry and pixels. Any material regression blocks completion.

Proposed source files: `app/globals.css` for a bounded token/deletion patch; `components/owner/partner-search.tsx` and `partner-shell.css` for leaf ownership; `components/marketing/marketing-hub.tsx` and `marketing.css` for summary presentation; `components/agent/dashboard.css` only for the three approved stale deletions; app `AGENTS.md` and the existing architecture tests for governance. Split these into reviewable commits only when committing is authorized. No commits are made by this audit.

### Deferred from the first slice

Auth CSS, dashboard artwork/compositions, header/sidebar geometry, verification SVG, marketing editor media geometry, import order consolidation and shared component API changes. Marketing create content must not be blindly swapped for default `LinkBtn`: its current 13px text, 10px radius, padding, height and interaction recipe differ. Continue using the existing `Btn`, fields, errors and skeletons where already present. Do not introduce a role conditional mega component.

No authentication, session store, authorization, tenant membership, API, database, RLS, storage behavior or workspace access policy changes belong in this refactor. Browser fixture interactions below do not constitute real backend verification.

## Visual baseline and verification

[Verification manifest](evidence/verification.json) records commands, scope and status. [Contact sheet](before/contact-sheet.png) is a navigation aid; full resolution files in `before/` are authoritative audit captures. Lazy images are decoded and fonts awaited before capture. These are current tree baselines, not proof of design reference pixel equality.

| Surface | New before evidence |
| --- | --- |
| Owner and Agent dashboard | 375×812, 834×1112, 1440×900, 1920×1080 |
| Owner and Agent open search | Same four sizes; additional synthetic interaction captures |
| Owner and Agent Account with workspace logo | Same four sizes |
| Verified identity and navigation drawer | Desktop avatar and mobile drawer for each role |
| Marketing overview and editor | Same four sizes for both screens |
| Sign in and Sign up protection baseline | Same four sizes; role/setup captures are supplemental |

The fresh production build passed. The first run of all three browser suites passed with intercepted synthetic API/provider responses. After improving image decoding for captures, partner/auth suites passed again; the marketing rerun timed out waiting for the Try again button. That rerun failure remains unresolved because this work was paused for Google authentication setup. The supplemental capture suite passed 16 captures, no horizontal overflow, and no stale selector DOM consumers in those captured states. There were no browser page errors in these suites. These results do not validate a deployed backend, real provider, tenant isolation or a completed refactor.

After evidence and pixel comparisons: **NOT RUN**, because no refactor was made. Typecheck/lint/unit tests for a changed implementation: **NOT RUN for this audit**; the production build itself completed compilation and its TypeScript phase. The validation plan below remains a gate, not a claimed result.

After approval, run the same pinned browser/channel, OS, DPR 1, reduced motion, fixture data, URL/state, viewport, fonts and decoded assets for both before and after. Freeze dates/IDs for snapshots that display them. Capture normal, focus, selected, error, empty, search open, uploaded logo and drawer states. Preserve the screenshot files; do not overwrite before files or automatically accept new baselines.

Compare bounding boxes and computed family/size/weight/line height/tracking, text/background/border colors, padding/gaps, radius, shadow and focus state for changed nodes plus header/sidebar/metric sentinels. Require identical geometry and approved values. Target zero pixel change; inspect any nonzero diff and allow only documented renderer antialiasing noise. Never mask layout, font, spacing or artwork changes to make a diff pass. Run `npm --prefix apps/owner-web run typecheck`, `lint`, `test`, and `build`, then relevant partner/marketing browser suites. Retest auth routes as cascade sentinels. Review direct route entry and navigation order if import ownership is later changed. Include keyboard and 200% zoom/reflow; historical reflow checks are not a new native device or actual zoom acceptance claim.

## Ticket reconciliation

Read-only GitHub inspection retrieved 130 repository issues and 130 Project items, including native parent relationships. [Reconciliation evidence](evidence/tracker-reconciliation.json) records the related issues. No exact Design System V2, frontend modernization or STYLE identifier match was found in the retrieved titles/bodies. This does not establish absence in Jira: no connected Jira WSP reader was available, so Jira reconciliation remains **UNVERIFIED**.

| Existing issue | Verified parent | Relationship to this work |
| --- | --- | --- |
| [#20 Delivery Epic](https://github.com/Masterkent11/rental-business-software/issues/20) | #12 | Suitable proposed parent for bounded styling maintenance; retain existing Epic |
| [#86 Shared component Storybook](https://github.com/Masterkent11/rental-business-software/issues/86), [#87 setup](https://github.com/Masterkent11/rental-business-software/issues/87), [#88 component states](https://github.com/Masterkent11/rental-business-software/issues/88) | #20, #86, #86 | Related documentation scope, not an exact targeted CSS refactor match; do not repurpose setup or install Storybook for this task |
| [#110 Auth visual coverage](https://github.com/Masterkent11/rental-business-software/issues/110) | #103 | Related auth protection coverage; preserve blocked approval gate and auth scope |
| [#64 Dashboard delivery](https://github.com/Masterkent11/rental-business-software/issues/64) | #62 | Existing feature acceptance remains; link evidence without resetting its history |
| [#139 Partner search](https://github.com/Masterkent11/rental-business-software/issues/139), [#140 Workspace logo](https://github.com/Masterkent11/rental-business-software/issues/140) | #62 | Existing current feature delivery; link leaf styling follow-up, no duplicate feature tickets |
| [#117 Marketing navigation](https://github.com/Masterkent11/rental-business-software/issues/117), [#122 media editor](https://github.com/Masterkent11/rental-business-software/issues/122) | #114, #121 | Preserve separate Agent feature scope and acceptance |

[Five ticket drafts](backlog-drafts.json) cover STYLE-001 through STYLE-005 with scope, exact affected files, acceptance criteria, dependencies, verification, evidence, approval gates and Definition of Done. They are **NOT PUBLISHED**, have no real issue IDs, and do not assert new parent links or sprint membership. Proposed sprint is the already approved Partner Experience November 1–14, 2026; actual assignment must be verified after publication. No board records or sprint histories were mutated during this audit. Resolve Jira deduplication before publishing unmatched drafts.

## Governance proposal

Append a human maintained styling section after the generated Next.js rules in app `AGENTS.md`. Require agents to inspect existing tokens/components first, use established Tailwind utilities for basic presentation, avoid new global component selectors or standalone files when utilities suffice, preserve exact UI and separate styling work from security/business changes. Require rationale and visual evidence for a legitimate CSS exception. Existing specialized effects and vendor integrations remain valid exceptions.

Use the existing Node architecture test entry point for a narrowly scoped stylesheet import policy. Document the five current stylesheets with owner, scope and exception rationale; reject newly introduced global component stylesheets/imports without a reviewed entry. Do not reject all CSS, all arbitrary Tailwind values, all media queries, or inherited legacy literals. Rejecting new occurrences should not force a full legacy migration. Add a small valid/invalid fixture check for the policy itself. Do not rely on a broad color regex that misclassifies SVG or third party data.

The existing ESLint config is Next.js focused; existing architecture tests enforce application boundaries but not styling governance. The quality workflow already runs app checks/builds; no browser screenshot regression job was found. Add a bounded visual evidence check/job only after agreeing the reproducible browser environment and baseline policy. It must never auto-update baselines. Installing Storybook, replacing lint infrastructure or adding a Design System V2 is outside this first slice.

## Approval gate

The task attachment explicitly says: “Stop for approval before modifying large shared stylesheets or introducing new design-system architecture.” It also requires a read-only audit first. This report makes the proposed `globals.css` token/deletion patch and the presentation-only slice reviewable before that gate. No competing design-system architecture is proposed.

Requested next decision: approve the bounded first slice above, or narrow it to leaf utilities only while deferring the global token/stale selector patch. Separate authorization remains necessary for security remediation, schema changes, production data, merge or deployment; none are included here.
