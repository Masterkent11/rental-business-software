# API coverage reconciliation

| Measure | Count / result |
|---|---:|
| Source-registered HTTP operations | 180 |
| OpenAPI operations | 180 |
| Postman requests | 180 |
| Inventory/export coverage | 100% of statically registered routes |
| Protected GET missing-token HTTP checks executed | 56 / 56 passed |
| Health HTTP check | 1 / 1 passed |
| Distinct HTTP routes behavior-exercised by collection runner | 57 / 180 (31.67%) |
| Authorized fixture-backed full HTTP lifecycle cases | Not implemented by this task |
| Unknown response schema nodes | 6; marked x-unresolved |

`registered-routes.json` comes from AppModule's reachable module/controller registration, not a filename glob. Generation fails for unresolved module metadata/global-prefix/versioning changes. TypeScript handler return types and actual imported Zod request schemas supply wire descriptions; known inline/special transport schemas are explicitly mapped. Authorization call-graph evidence appears in OpenAPI, but a complete per-operation role/error/environment manual reconciliation is still pending. The file/module-boundary test suite and database tests are additional coverage; they cannot be counted as all 180 HTTP routes passing.

The compatible collection runner executes request safety guards and status/success-schema/error-envelope assertions. Only synthetic missing-token reads and health were executed against the local API; no live customer or payment mutation was run. Optional-auth recommendations/support are documented with optional security instead of being incorrectly required-auth operations. Webhook signature handling is a provider contract, not a fabricated login endpoint. No GraphQL/WebSocket/SSE HTTP interface was found in the registered Nest controllers; Supabase Realtime subscriptions are a separate external interface.

Remaining behavioral matrix: valid owner/customer/admin tokens, expired tokens with valid signatures, forbidden roles, foreign tenant/object access, invalid DTO inputs, 404 semantics, pagination, repeated/mutating idempotent requests, ordered fixture creation/cleanup and payment/webhook cases. The earlier isolated PostgreSQL checkpoint passed 501 backend tests, covering domain/persistence invariants including ownership, financial allocation and verification submission; see architecture-audit/06-test-results. A request inventory alone is not functional test coverage.

Reproduce from `apps/api`: `npm run contracts:generate`, `npm run contracts:validate`, `npm run contracts:smoke`, and `npm run contracts:smoke -- --unauthorized`. Independent OpenAPI 3.1 validation also passed with `@apidevtools/swagger-parser@12.1.0` installed outside the workspace. Postman Collection v2.1 validates against its vendored official draft-04 schema. No production Swagger exposure exists.

Continuation verification: 561 backend tests passed with disposable PostgreSQL on Node 24.19. These are backend unit/integration checks; executed collection behavior coverage remains 57/180 registered endpoints.
