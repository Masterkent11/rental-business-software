# Baseline — 2026-10-22

Branch: `feature/demo/mvp/07/10/2026`. Working tree was clean at the start of this request. Existing work from preceding tasks was already in the baseline; no reset/restore/stage/commit/push was performed.

Three separately managed applications: Flutter customer_app, NestJS/Fastify api, Next.js owner-web. No root package workspace manifest or pre-existing GitHub Actions directory. Supabase migrations and test helpers live at the root. API has strict Clean/Hexagonal AGENTS.md and automated architecture tests. Owner Web requires reading installed Next docs before changes; the installed use-client documentation was read.

Toolchain observed: Flutter 3.47.6, Dart 3.13.5, Xcode 27.0; default Node 23.10.0 despite Node manifest requirement >=24.19 <25. Node 24.19 was obtained through an isolated npx tool package for dependency remediation. No Android SDK. iPhone and iOS Simulator were detected, but detection does not count as device testing. Disk had only 2.6 GiB available initially.

| Baseline command | Observed result |
|---|---|
| API npm test | 337 passed; 162 skipped across 14 database suites |
| API typecheck / lint | Passed |
| Owner npm test | 58 passed |
| Owner typecheck / lint | Passed |
| Flutter test | 304 passed |
| Flutter analyze | 4 informational deprecations in reference Dart files inside asset pack |
| Dart format lib test, check-only | 8 pre-existing formatting differences; no files written |

Logs are retained at `/private/tmp/wsp-enterprise-baseline/`. This is local evidence, not committed secret-bearing runtime logs. API tests ran without live database configuration. The existing `scripts/test-db.sh up` drops/recreates a database; it was inspected and **not executed**. No existing/shared database mutation, credential rotation, provider configuration, deployment, or production release was performed. Later integration testing created a separate temporary PostgreSQL cluster and synthetic fixtures.

Baseline architectural observations: API exposes capabilities through use cases/ports and enforces import boundaries through tests; mobile has both newer domain/application feature folders and older data/presentation organization; Owner Web has ports/adapters with presentation stores. The approved dashboard scale and graph style remain unchanged.
