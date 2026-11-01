# Repository, authentication and tracker audit

Audit date: 2026-11-01, Asia/Manila. Source baseline: `9b5689c2d0a0a0079dad83e92ad838d8f708cf65`; branch `story-book/agile/31-10-2026`. This is the local checkout, not a claim that it matches current remote master.

## Instructions and preserved work

- No root/ancestor AGENTS.md or CONTRIBUTING.md was found in the inspected checkout. `apps/owner-web/AGENTS.md` requires consulting the installed Next guides before code work. Installed layout/page and route handler guides were read; no code was written.
- `apps/api/AGENTS.md` and `apps/api/docs/architecture/development-workflow.md` enforce Clean Architecture, Hexagonal boundaries, thin controllers, ports and use cases, negative authorization tests and typecheck/lint/test checks.
- Existing roadmap `docs/11-implementation/mvp-roadmap.md` defines the Definition of Done and historical Sprint 1–6 scopes. These names are preserved without assigning this redesign to a historical sprint.
- Initial uncommitted work: `docs/agile/`, `scripts/agile/`, and the supplied role selection asset directory were untracked. Preserve all. New planning files live only under this epic directory.
- Existing `.github/workflows/quality.yml` runs API/Owner Web typecheck, lint, tests and build plus Flutter and contract checks. No CODEOWNERS or explicit branch review policy file was found; remote protection requirements were not changed or bypassed.
- Root README still describes early shells and says API/Supabase directories do not exist. Those claims are stale relative to real source. Authentication architecture says web SSR cookies and excludes social login in V1; actual browser session code differs. These are documented conflicts requiring deliberate approval, not silently rewritten history.

## Actual stack

Owner Web: `apps/owner-web`, Next 16.3.1 App Router, React 19.2.8, Tailwind 4.3.3, TypeScript 5.9.3, Zustand 5.0.15, Zod, lucide-react, HeroUI 3 and existing copied UI components. Installed Supabase JS 2.112.4 and SSR 0.12.5; the SSR dependency is installed but the current auth adapter uses JS createClient.

API: `apps/api`, NestJS 11.2.7 with Fastify 5.12.7; PostgreSQL through ports/adapters, Supabase JWKS identity verification through jose. No new backend identity storage or auth endpoints are justified for a visual redesign.

## Existing behavior

1. Every page in `app/(owner)` is wrapped by OwnerShell. Unauthenticated visitors see `components/owner/sign-in.tsx` at the requested URL; there is no dedicated `/sign-in` route.
2. The form uses existing Btn, Field, TextInput, InlineError and BrandMark. Email/password are blank, password visibility works, and duplicate submissions are blocked. Store validation requires a syntactically valid email and at least six password characters.
3. Store → session use case → SessionPort → SupabaseSessionAdapter calls Supabase signInWithPassword directly. Passwords are not sent to NestJS.
4. Adapter resolves GET /me via HttpClient bearer token. API validates JWT signature, issuer, audience and expiry and loads capabilities/membership from the database. Frontend guards are presentation, not the authorization boundary.
5. Workspaces derive from live organization membership plus the agent profile. One workspace opens directly; multiple workspaces prompt unless a valid remembered key exists. Unknown remembered keys do not create authority. No workspace offers AgentSetupCard and asks the owner to add membership.
6. Sign out clears active identity and workspace data. Lifetime guards prevent late initialize/refresh responses from restoring the old user. On successful Supabase sign-in followed by a failed /me resolution, the adapter signs the session out.
7. Browser client persists and refreshes sessions, with detectSessionInUrl false. No callback route, auth state subscription, recovery route, signup, OAuth button or terms/privacy routes were found in Owner Web. SDK support alone does not mean those flows exist.

## Design system and asset findings

`app/globals.css` aliases legacy tokens to HeroUI and uses SF Pro/system fonts with Geist fallback. The exact mockup typeface has not been supplied. `components/owner/brand.tsx` uses a navy tile PNG; the role pack includes a standalone white traced SVG mark. Neither proves original vector provenance for all screenshot variants.

The two supplied auth references are preserved unchanged with SHA-256 in asset-register.json. The role pack contains exact screenshot crops, traced vectors and an inpainted photo. Its photo is a different architectural composition from the auth villa; it is not an exact substitute. No original auth photo or standalone villa preview image was found in Owner Web public assets. User confirmed composite-only availability.

## Tracker reconciliation

Live GitHub authentication verified as Masterkent11; repository ADMIN permission and Project 3 viewerCanUpdate were true. Project is private. All 92 existing repository issues, open and closed, were read before planning publication. No AUTH-001–AUTH-008, WSP-AUTH-EPIC-01 or matching Owner Web auth redesign ticket existed. GitHub connector searches also returned no auth key matches. CLI is used only for Project/native hierarchy operations the connector does not expose.

Preserve and reference these existing records:

| Existing issue | Relationship to this plan |
| --- | --- |
| #12 product initiative | Proposed native parent of the new scoped auth epic |
| #14 identity epic | Related architecture authority; do not recreate or reparent its completed children |
| #29–#31 customer identity story/tasks | Customer Flutter work; not Owner Web redesign tickets |
| #32–#34 access boundaries and state invalidation | Existing backend/Owner Web regression baseline; do not duplicate completed implementation |
| #86–#88 Storybook foundation | AUTH-007 depends on these; no second Storybook installation ticket |

No Jira credentials, live Jira connection or WSP issue references were verified. No design/security/owner approval for this complete redesign package was found; #14 has no comments. Current request authorizes planning and establishes the screenshots as visual targets, but does not approve the finished implementation plan or provider changes.

## Verification run

Read-only baseline command: `/Users/admin/.nvm/versions/node/v24.19.0/bin/node --experimental-strip-types --test __tests__/session-lifetime.test.mjs __tests__/partner-portal-domain.test.mjs`, working directory apps/owner-web. Exit 0, 16 passed, 0 failed, 0 skipped. These are store/domain tests, not live auth E2E or visual acceptance.

The first run used shell Node 23.10.0 and also passed 16 tests, but that version is outside package engines. The recorded supported baseline was rerun on already installed Node 24.19.0 without installing or changing packages. No full build, lint, app E2E or provider mutation was needed or performed for documentation-only work. No new CI run or PR exists for this plan.

## Deployment/configuration boundaries

Owner Web package dev port is 3200. Local supabase/config.toml still declares site_url http://127.0.0.1:3000, additional redirect https://127.0.0.1:3000, email signup enabled and confirmations disabled. No active Google configuration block is present. These are local defaults, not verified hosted provider settings.

Previous Project #80–#82 record Render/Vercel deployment work; their historical completion is not a new production readiness check. This phase inspected deployment/env documentation and API CORS setup only. Hosted Google, SMTP, confirmation policy, redirect allowlists, deployment health, branch protection and security review remain unverified. Never expose .env credentials in docs or issues.
