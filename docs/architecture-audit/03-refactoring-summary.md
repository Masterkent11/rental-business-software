# Controlled changes

F01 adds one typed Flutter AppConfig and removes two competing fallback paths. Bootstrap compatibility injection is retained for tests, which now use synthetic configuration. Nine iOS flavor xcconfigs, three schemes, matching Podfile configurations and Android flavors preserve existing production identifiers/signing. See environment-management.md for exact commands and release limits.

F02 restricts and bounds raw webhook buffering in an infrastructure adapter; HTTP composition invokes it. F03 makes Owner session state reject stale async results and suppress duplicate sign-in; F04 recovers the mobile disk-cache queue after storage failure. F05 moves Flutter icons out of domain models into presentation extensions with identical icon choices. F08 centralizes Owner HTTP timeout/error handling. No approved screen layout, dashboard scaling, business pricing, booking lifecycle, authorization policy, or verification outcome rule was changed.

API dependency patches address audited advisories without a major framework migration. Contract tools generate registered-route metadata, OpenAPI, complete Postman exports and safe environment templates; their tests do not imply full API behavioral coverage. Added CI validates synthetic public environment configs and runs checks/builds; remote protected-environment settings remain an operator task. No deployment action exists.

Important changed source groups: mobile app_config/bootstrap/api_client/offline_cache/explore domain+presentation/native configuration; API main/webhook-body adapter+tests/package manifests/contracts scripts; Owner session store/http client+tests/browser test base URL. `git diff --name-only` plus `git ls-files --others --exclude-standard` provides the exact complete working change list. All edits remain unstaged.

Regression evidence: three Owner session tests reproduced failures before the fix; focused new cache, config, domain-boundary and webhook tests exercise failure paths. See 06-test-results. This refactoring does not complete the remaining mandatory whole-codebase audit.

## Production source changes

26 Dart/TypeScript production source files changed (including newly added source):

- `apps/api/src/application/collection/issue-invoice/issue-invoice.use-case.ts`
- `apps/api/src/application/ports/repositories/invoice-repository.port.ts`
- `apps/api/src/domain/collection/collection-errors.ts`
- `apps/api/src/domain/collection/collection-rules.ts`
- `apps/api/src/domain/listings/listing-rules.ts`
- `apps/api/src/domain/occupancy/occupancy-rules.ts`
- `apps/api/src/domain/shared/calendar.ts`
- `apps/api/src/domain/shared/money.ts`
- `apps/api/src/infrastructure/http/webhook-body.adapter.ts`
- `apps/api/src/infrastructure/postgres/repositories/postgres-invoice.repository.ts`
- `apps/api/src/main.ts`
- `apps/api/src/modules/shared/http-exception.filter.ts`
- `apps/customer_app/lib/app/app_config.dart`
- `apps/customer_app/lib/app/bootstrap/app_bootstrap.dart`
- `apps/customer_app/lib/data/api_client.dart`
- `apps/customer_app/lib/data/offline_cache.dart`
- `apps/customer_app/lib/features/editorial/domain/editorial_card.dart`
- `apps/customer_app/lib/features/explore/application/search_suggestions.dart`
- `apps/customer_app/lib/features/explore/domain/explore_query.dart`
- `apps/customer_app/lib/features/explore/domain/listing_category.dart`
- `apps/customer_app/lib/features/explore/presentation/explore_icons.dart`
- `apps/customer_app/lib/features/explore/presentation/widgets/buy_filters_sheet.dart`
- `apps/customer_app/lib/features/explore/presentation/widgets/rent_filters_sheet.dart`
- `apps/customer_app/lib/features/explore/presentation/widgets/search_suggestions_panel.dart`
- `apps/owner-web/infrastructure/http/http-client.ts`
- `apps/owner-web/stores/use-session-store.ts`

Continuation: F12 atomically constrains payment allocations by source payment and target invoice, with a matching additive database trigger for direct writes. F13 rejects precision-losing centavo values. F14 moves invoice validation/calculation into domain policy. F17 prevents old disk search history from overriding a newer clear. F15 corrects inventory metadata and adds scanner regression tests. The isolated database launcher now removes only its marked stopped cluster and preserves its server log; CI includes that database suite.

All 17 Owner application/port files were inspected in this continuation without changing their production behavior. F16 identifies remaining concrete mobile repository/model coupling; it is explicitly unresolved. Financial migration tests use disposable fixtures only; no deployed schema or historical records were changed.

F18 shares strict calendar-date validation across occupancy ranges and invoice periods. Domain review also covered identity capabilities, messaging eligibility, inquiries, application/reservation transitions, agent profiles/representation, deterministic assignment, and shared geography. Passing domain tests do not certify unreviewed callers or persistence.

F19 enforces safe rental price/fee values, integral minimum nights and nonnegative whole advance/deposit months in domain policy. Existing DTO numeric constraints were reviewed; many invalid HTTP values were already rejected there. Eight domain regressions demonstrate the corrected gap.
