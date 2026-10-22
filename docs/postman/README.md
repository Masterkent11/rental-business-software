# WeStayPlace API collection

Import `WeStayPlace_API_Complete.postman_collection.json` (v2.1) and an environment template. All 180 source-registered HTTP routes are present. Templates have no real credentials or customer identifiers. OpenAPI and inventory are in `docs/api`.

From `apps/api`:

```sh
npm ci
npm run contracts:generate
npm run contracts:validate
npm run contracts:smoke
POSTMAN_REPORT=/tmp/wsp-unauthorized.json npm run contracts:smoke -- --unauthorized
POSTMAN_ENVIRONMENT=/absolute/path/disposable-staging.json npm run contracts:smoke -- --all-reads --allow-remote-staging
```

The compatible runner executes the generated collection's prerequest and test scripts using Node fetch, Chai, and Ajv. It supports this collection's API subset, not arbitrary Postman packages or UI plugins. Default execution is `/health` only. Unauthorized mode runs protected GET routes without a token and expects 401. This cannot prove ownership isolation or role enforcement with valid tokens. Reports default to `/tmp/westayplace-api-report.json` and contain assertions/status/errors, not response payloads.

Authentication is external Supabase Auth. The Nest API has no password-login or token-refresh route. Obtain a token for a synthetic test account using the existing application's normal sign-in, then supply `access_token` locally. `refresh_token` is an empty reserved variable; the collection does not invent an API refresh operation. Organization permissions are resolved by the backend; bearer possession alone does not grant owner/admin access.

Supply fixture identifiers through variables. Synthetic UUIDs/examples demonstrate payload shape, not persisted records. Zod refinements, image evidence, signed upload tickets, and actual provider callbacks need valid fixture data. Response examples are generated synthetic shapes and are not captured production responses. `x-unresolved` in OpenAPI records untyped response fields; TypeScript-derived schemas do not replace runtime response validation.

Each request is labeled read-only, mutating/destructive, payment-related, or sensitive-data-related. Collection guards block mutations unless `allow_mutations=true`, and always block them when `environment=production`. The runner refuses production entirely and permits remote staging only with an explicit flag. Do not relabel production as staging. Never use real-money callbacks or customer identity evidence as fixtures.

To intentionally test mutations against a disposable non-production fixture tenant:

```sh
POSTMAN_ENVIRONMENT=/absolute/path/disposable-fixtures.json npm run contracts:smoke -- --mutations
```

This does **not** provision or clean fixtures. Do not run the full mutation set without a reviewed fixture/dependency plan. Signed webhooks require the provider signature in `x_signature`; the backend webhook secret must stay on the server. An `expected_status` local override supports individual negative checks in Postman. Do not use one global override to mask unrelated failures.

The export has status, success-shape, and error-envelope assertions. Forbidden-role/foreign-owner, validation, not-found, pagination, replay/idempotency, and complete mutation lifecycle cases still require fixture-backed behavioral expansion. See `docs/api/api-test-coverage.md`; inventory coverage is distinct from test coverage.

The official Postman schema is vendored in `apps/api/scripts/contracts/postman-v2.1.schema.json` from https://schema.getpostman.com/json/collection/v2.1.0/collection.json. `contracts:validate` checks it with the draft-04 validator, validates embedded JSON schemas, and reconciles route/OpenAPI/Postman keys. No public Swagger route was added.

Continuation verification: 561 backend tests passed with disposable PostgreSQL on Node 24.19. These are backend unit/integration checks; executed collection behavior coverage remains 57/180 registered endpoints.
