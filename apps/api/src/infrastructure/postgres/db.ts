import postgres from 'postgres';

/**
 * The database connection.
 *
 * Note what this is NOT: the Supabase service role. That key bypasses RLS
 * entirely, and an API using it has one isolation layer pretending to be two
 * (ADR-0006). The connection string points at an application role that
 * policies apply to.
 */
const url =
  process.env.DATABASE_URL ??
  'postgres://postgres:postgres@localhost:54322/postgres';

/**
 * Supabase's pooler runs pgbouncer in transaction mode, which does not support
 * prepared statements — postgres.js uses them by default and would fail.
 *
 * Detected from the host rather than configured, because getting it wrong
 * produces a confusing runtime error rather than a clear one. Transaction
 * pooling is otherwise fine for us: `set_config(..., true)` is transaction-local
 * by design, so the organization scope still cannot leak between requests.
 */
const isTransactionPooler = url.includes('pooler.supabase.com');

export const sql = postgres(url, {
  /**
   * Every authenticated request opens two transactions — one to resolve the
   * principal, one for the endpoint's own work — so the pool is consumed twice
   * as fast as the request count suggests. Ten was enough locally and queued
   * under a handful of concurrent app requests against a remote database.
   */
  max: 20,
  idle_timeout: 20,
  prepare: !isTransactionPooler,
});

/**
 * Run work inside a transaction with the organization scope set.
 *
 * `set_config(..., true)` makes the setting **transaction-local**. That third
 * argument is the whole reason RLS and connection pooling can coexist here:
 * without it, one request's scope leaks into whoever gets the connection next,
 * which is the quiet way this pattern fails.
 */
export async function withScope<T>(
  organizationId: string | null,
  work: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.organization_id', ${organizationId ?? ''}, true)`;
    return work(tx);
  }) as Promise<T>;
}

/**
 * Run work inside a transaction with the **user** scope set.
 *
 * Identity is platform-scoped, not organization-scoped: a user belongs to no
 * organization (entities.md), so the identity tables are isolated by "am I this
 * user" rather than by tenant. Same transaction-local discipline as
 * `withScope`, for the same reason — a pooled connection must not carry one
 * request's identity into the next.
 */
export async function withUser<T>(
  userId: string,
  work: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.user_id', ${userId}, true)`;
    return work(tx);
  }) as Promise<T>;
}

/**
 * Both scopes at once, for a request that is a known user acting inside an
 * organization.
 */
export async function withUserAndScope<T>(
  userId: string,
  organizationId: string | null,
  work: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.user_id', ${userId}, true)`;
    await tx`select set_config('app.organization_id', ${organizationId ?? ''}, true)`;
    return work(tx);
  }) as Promise<T>;
}

export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (character) => `\\${character}`);
