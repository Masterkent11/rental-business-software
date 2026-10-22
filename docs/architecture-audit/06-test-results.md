# Executed verification

Evidence directory: `/private/tmp/wsp-enterprise-baseline/`. Baseline and final logs are separate. No automatic commit, push, deployment, real-money test, shared DB reset, or physical camera run occurred.

| Check | Actual result |
|---|---|
| Baseline API unit/application/controller/architecture | 337 passed, 162 DB tests skipped |
| Final API without DB | 339 passed, 162 skipped |
| API with isolated PostgreSQL, first full run | 500 passed, 1 pre-existing stale Matterport test failed |
| Isolated PostgreSQL after test contract/fixture correction | 501 passed across all 59 files; no skipped tests |
| API typecheck, lint, production build | Passed after source fixes and dependency updates; API gates plus all 501 tests repeated on Node 24.19 |
| Baseline Flutter full suite | 304 passed |
| Flutter final full suite | 315 passed |
| Latest focused Flutter config/bootstrap/cache/domain/boundary suite | 87 passed |
| Compiled dev/staging/production public example config tests | Passed for all 3 define files |
| Flutter analyze lib test | Passed, no issues |
| Flutter analyze full tree | Baseline 4 asset-reference deprecations; temporary introduced unused import corrected |
| Baseline whole Dart format check | Failed: 8 existing files differ; no blanket reformat performed |
| Changed Dart source/test format check | Passed after formatting the new architecture gate |
| iOS development simulator build | Passed (242.3 seconds); generated build output later removed to recover disk |
| iOS staging simulator build | Failed: CodeSign nonzero; exact root cause not established |
| iOS production simulator build | Failed: explicit ENOSPC / no space left during Flutter framework copy |
| iOS native flavor inventory/build settings | Three shared schemes and matching configs present; development PODS_ROOT and suffixed identifier resolved |
| Android development build | Blocked: no Android SDK |
| Baseline Owner tests | 58 passed |
| Owner new session regressions before correction | 3 failed (reproduced late session/duplicate sign-in bugs) |
| Final Owner tests | 62 passed, repeated on Node 24.19 |
| Owner typecheck, lint, production build | Passed |
| Owner production browser regression | Passed; actual Chrome with synthetic mocked auth/API fixtures |
| Source route/OpenAPI/Postman reconciliation | 180 / 180 / 180, no duplicate route keys |
| Postman official v2.1 schema and embedded JSON schemas | Passed |
| Independent OpenAPI validation | Passed with swagger-parser 12.1.0 installed outside repository |
| Collection health smoke | 1 passed |
| Collection protected GET missing-token checks | 56 passed / 56 executed |
| Public config/artifact credential-pattern scanner | Passed; limited scope, not full secret audit |
| API npm audit after clean resolved dependency tree | 0 vulnerabilities at time of run |
| CI workflow | Authored; remote GitHub Actions run not executed |

The original isolated DB failure is documented in earlier `apps/api/docs/step1-investigation.md` and `identity-verification.md`, including an unchanged-HEAD reproduction. Commit `ec48cd9` explicitly removed Matterport; the old test still expected its model ID. Correcting that assertion uncovered a second fixture mismatch: Jun inherited canManageTour=true from DEFAULT_PERMISSIONS but the negative test expected denial. The fixture now explicitly sets canManageTour=false, keeping the permission-denial assertion intact. No production provider or permission rule changed.

Browser checks cover desktop/laptop/mobile responsive geometry, loading/empty/error/retry, workspace switch, unread filters, notifications, chart disposal/resize, signed-out requests and absence of page/hydration errors. They do not validate real Supabase auth/RLS. No new device test was inferred from detecting an attached iPhone.

The old `test-db.sh up` resets a named DB and was not used. New `npm run test:isolated` creates a fresh private cluster, applies existing migrations and synthetic fixtures, runs tests and stops that cluster. It does not drop or reset any pre-existing database. Server logs are retained locally; marked stopped synthetic cluster directories are removed by the launcher.

## Continuation on 22 October 2026

| Check | Actual result / evidence |
|---|---|
| New allocation regressions before correction | 7 failed, 7 passed (`allocation-before.log`) |
| Money primitive before correction | 1 failed, 5 passed (`money-before.log`) |
| Search-history lifecycle before correction | 1 failed, 1 passed (`recent-searches-before.log`) |
| Full API with disposable PostgreSQL on Node 24.19 | **541 passed in 60 files**, none skipped (`continuation-node24-final.log`) |
| API typecheck/lint/build and contract checks | Initial typecheck caught narrowed invoice argument mismatch; corrected `balanceOf` input. All gates then passed (`continuation-gates-final.log`) |
| Flutter full suite | **317 passed** (`continuation-flutter-full.log`) |
| Flutter analyze lib test | No issues (`continuation-flutter-analyze.log`) |
| Audit scanner unit tests | 2 passed |

Financial integration tests include raw SQL scope/state/budget enforcement, concurrent allocations, duplicate allocation/ledger protection, and guard-function security attributes. No final submission, provider verification or foreign-role HTTP behavior is inferred from these database tests. The 57 previously executed HTTP checks remain distinct from 541 backend tests. No native build or Owner production code was changed during this continuation; earlier native/Owner results above remain the last executed results.

Local fixture roles use broad grants, so these tests do not certify production least privilege. Remote CI was authored but not run. Historical financial reconciliation and live migration rollout remain pending. Full file review and cross-application acceptance are incomplete.

Additional domain review reproduced six impossible-calendar-date failures (`calendar-before.log`: 6 failed, 14 passed). After shared calendar validation in occupancy ranges and invoice periods, that complete run passed **553 tests in 60 files**, no skips (`continuation-calendar-final.log`). Typecheck, lint, build and contract checks also passed in that same run. The previous 541-test result above is the preceding checkpoint, not the latest total.

Listing numeric review reproduced eight domain validation failures (`listing-numeric-before.log`: 8 failed, 11 passed). After correction, the **latest full backend run passed 561 tests in 60 files**, no skips, followed by passing typecheck, lint, build, contract typecheck/generation/validation (`continuation-listing-final.log`). Many invalid numeric requests were already blocked at HTTP DTO boundaries; the regression closes the domain gap without claiming an HTTP exploit.
