import type { TransactionSql } from "postgres";
import type {
  FacebookChannel,
  FacebookConnectionRepository,
  PendingFacebookPage,
} from "@/application/ports/repositories/facebook-connection-repository.port.ts";
import { MarketingUnavailableError } from "@/domain/marketing/marketing.ts";
import { withUser } from "@/infrastructure/postgres/db.ts";

interface ConnectionRow {
  page_id: string;
  page_name: string;
  connected_at: Date;
}

function connection(
  row: ConnectionRow | undefined,
): FacebookChannel["connection"] {
  return row
    ? {
        id: row.page_id,
        name: row.page_name,
        connectedAt: row.connected_at.toISOString(),
      }
    : null;
}

async function run<T>(
  userId: string,
  work: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  try {
    return await withUser(userId, work);
  } catch {
    throw new MarketingUnavailableError(
      "The Facebook connection could not be updated. Try again.",
    );
  }
}

export function postgresFacebookConnectionRepository(): FacebookConnectionRepository {
  return {
    async read({ userId, agentId }) {
      return run(userId, async (tx) => {
        await tx`delete from app_private.facebook_page_attempts where agent_id = ${agentId} and expires_at <= now()`;
        const [current] = await tx<ConnectionRow[]>`
            select page_id, page_name, connected_at from app_private.facebook_page_connections where agent_id = ${agentId}
          `;
        const [attempt] = await tx<
          { state_digest: string; pages: { id: string; name: string }[] }[]
        >`
            select state_digest, (
              select jsonb_agg(jsonb_build_object('id', page->>'id', 'name', page->>'name'))
              from jsonb_array_elements(pages) as page
            ) as pages
            from app_private.facebook_page_attempts
            where agent_id = ${agentId} and expires_at > now() and jsonb_array_length(pages) > 0
          `;
        return {
          connection: connection(current),
          selection: attempt
            ? { id: attempt.state_digest, pages: attempt.pages }
            : null,
        };
      });
    },
    async start({ userId, agentId }, digest) {
      await run(userId, async (tx) => {
        await tx`
          insert into app_private.facebook_page_attempts (agent_id, state_digest, expires_at)
          values (${agentId}, ${digest}, now() + interval '10 minutes')
          on conflict (agent_id) do update set state_digest = excluded.state_digest,
            expires_at = excluded.expires_at, consumed = false, pages = '[]'::jsonb
        `;
      });
    },
    async claim({ userId, agentId }, digest) {
      return run(userId, async (tx) => {
        const rows = await tx`
          update app_private.facebook_page_attempts set consumed = true
          where agent_id = ${agentId} and state_digest = ${digest} and not consumed and expires_at > now()
          returning agent_id
        `;
        return rows.length === 1;
      });
    },
    async stage({ userId, agentId }, digest, pages) {
      return run(userId, async (tx) => {
        const rows = await tx`
          update app_private.facebook_page_attempts set pages = ${tx.json(pages.map((page) => ({ ...page })))}
          where agent_id = ${agentId} and state_digest = ${digest} and consumed and expires_at > now()
          returning agent_id
        `;
        return rows.length === 1;
      });
    },
    async select({ userId, agentId }, selectionId, pageId) {
      return run(userId, async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtextextended(${agentId}, 123))`;
        const [attempt] = await tx<{ pages: PendingFacebookPage[] }[]>`
          delete from app_private.facebook_page_attempts
          where agent_id = ${agentId} and state_digest = ${selectionId} and consumed and expires_at > now()
            and pages @> jsonb_build_array(jsonb_build_object('id', ${pageId}::text))
          returning pages
        `;
        const page = attempt?.pages.find(({ id }) => id === pageId);
        if (!page) return false;
        const [previous] = await tx<{ page_id: string }[]>`
          select page_id from app_private.facebook_page_connections where agent_id = ${agentId}
        `;
        if (previous && previous.page_id !== page.id) {
          await tx`
            insert into app_private.facebook_page_connection_events (agent_id, page_id, action)
            values (${agentId}, ${previous.page_id}, 'DISCONNECTED')
          `;
        }
        await tx`
          insert into app_private.facebook_page_connections (agent_id, page_id, page_name, encrypted_token)
          values (${agentId}, ${page.id}, ${page.name}, ${page.encryptedToken})
          on conflict (agent_id) do update set page_id = excluded.page_id, page_name = excluded.page_name,
            encrypted_token = excluded.encrypted_token, connected_at = excluded.connected_at
        `;
        await tx`
          insert into app_private.facebook_page_connection_events (agent_id, page_id, action)
          values (${agentId}, ${page.id}, 'CONNECTED')
        `;
        return true;
      });
    },
    async disconnect({ userId, agentId }) {
      await run(userId, async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtextextended(${agentId}, 123))`;
        await tx`delete from app_private.facebook_page_attempts where agent_id = ${agentId}`;
        const [removed] = await tx<{ page_id: string }[]>`
          delete from app_private.facebook_page_connections where agent_id = ${agentId} returning page_id
        `;
        if (removed) {
          await tx`
            insert into app_private.facebook_page_connection_events (agent_id, page_id, action)
            values (${agentId}, ${removed.page_id}, 'DISCONNECTED')
          `;
        }
      });
    },
  };
}
