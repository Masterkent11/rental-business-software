# Running it locally

> **Status:** Written (Sprint 1)
> **Last updated:** 2026-08-22

## The database

Sprint 1 runs against the hosted Supabase project `rental-business-software`
(`yoscanunnqbzmlnwzift`, PostgreSQL 17, ap-northeast-1).

### Connect as `rental_app`, never as the secret key

The API's `DATABASE_URL` uses the **`rental_app`** role — `NOSUPERUSER`,
`NOBYPASSRLS`.

This is not a detail. Supabase's `sb_secret_*` key and the `postgres` superuser
both **bypass RLS entirely**. Connecting with either would leave the database
layer of [ADR-0006](../12-adr/0006-multi-tenancy-enforcement.md) doing nothing
while appearing to work — one isolation layer pretending to be two. Every
isolation test would pass and prove nothing.

The integration suite asserts this directly:

```ts
expect(rows[0]!.bypass).toBe(false);
expect(rows[0]!.superuser).toBe(false);
```

### Pooler, not direct

The project has no IPv4 add-on, so `db.<ref>.supabase.co` does not resolve from
an IPv4-only machine. Use the pooler:

```
postgresql://rental_app.<ref>:<password>@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

Port 6543 is **transaction** pooling, which does not support prepared
statements. `db.ts` detects `pooler.supabase.com` in the URL and sets
`prepare: false` — detected rather than configured, because getting it wrong
produces a confusing runtime error instead of a clear one.

Transaction pooling is otherwise a good fit: `set_config('app.organization_id',
$1, true)` is transaction-local, so the scope cannot leak between requests
sharing a pooled connection.

### Running fully offline

Any PostgreSQL 16+ works — that is [ADR-0001](../12-adr/0001-supabase-api-mediated.md)
being exercised, not a workaround. See [05-database](../05-database/README.md)
for the `initdb` recipe.

## Two environment traps

### Flutter tests need `--concurrency=1` on a constrained machine

```bash
flutter test --concurrency=1
```

Run in parallel on a machine low on disk, the two test files compile
concurrently and the run takes **twelve minutes and reports two files as failing
to load**. Run serially it takes **four seconds and passes**. The failure looks
exactly like a compile error in the test code, which is what makes it expensive
— worth reaching for `--concurrency=1` before debugging a "broken" test.

### Docker wedges permanently after a full disk

If the disk fills while Docker is pulling images, the daemon does not recover
when space is freed — `docker info` hangs indefinitely. Only a Docker Desktop
restart clears it. Nothing in Sprint 1 needs Docker; Supabase Auth in Sprint 2
will.


## Running the API without Supabase Auth

`apps/api/scripts/fake-idp.mjs` serves an ES256 JWKS on port 9099 and prints
signed tokens. Point the API at it and every authenticated route works without
creating a user in a real project:

```bash
node scripts/fake-idp.mjs   # prints {"base":…,"ana":…,"ben":…,"anon":…}
SUPABASE_URL=http://127.0.0.1:9099 npx tsx src/main.ts
```

It exists because verifying the auth layer should not require signing somebody
up. The `anon` token it mints is deliberate: it is a valid signature over
nobody, and the API must reject it.


## Integration tests leave residue on a shared database

The identity tests create users, and the application role holds no `DELETE` on
the identity tables — deliberately, since nothing in the product deletes a user.
Cleanup therefore needs an admin connection:

```bash
TEST_ADMIN_DATABASE_URL=postgres://postgres@127.0.0.1:55432/rental_mvp
```

Locally that is set and the tests tidy up after themselves. Against **hosted
Supabase** there is no such URL, so each run leaves a couple of profile rows
behind. Every test identity uses the reserved `@example.test` domain, so they
are safe to sweep:

```sql
delete from saved_listings where user_id in (
  select id from user_profiles where email like '%@example.test');
delete from user_capabilities where user_id in (
  select id from user_profiles where email like '%@example.test');
delete from organization_members where user_id in (
  select id from user_profiles where email like '%@example.test');
delete from user_profiles where email like '%@example.test';
```

Two tests also self-skip without an admin URL — membership grant/revoke among
them. Running the suite only against hosted Supabase therefore proves less than
running it locally; do both.
