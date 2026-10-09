import type postgres from 'postgres';
import type { ContentRepository } from '@/application/ports/repositories/content-repository.port.ts';
import type {
  AcceptanceContext,
  ContentKind,
  ContentPage,
  ContentStatus,
  PolicyAcceptance,
} from '@/domain/content/content.ts';
import { withScope, withUser } from '@/infrastructure/postgres/db.ts';

interface PageRow {
  slug: string;
  version: number;
  kind: ContentKind;
  title: string;
  summary: string;
  body: string;
  status: ContentStatus;
  requires_acceptance: boolean;
  effective_on: string | null;
  published_at: Date | null;
}

interface AcceptanceRow {
  user_id: string;
  slug: string;
  version: number;
  context: AcceptanceContext;
  related_id: string | null;
  accepted_at: Date;
}

const toPage = (row: PageRow): ContentPage => ({
  slug: row.slug,
  version: row.version,
  kind: row.kind,
  title: row.title,
  summary: row.summary,
  body: row.body,
  status: row.status,
  requiresAcceptance: row.requires_acceptance,
  effectiveOn: row.effective_on,
  publishedAt: row.published_at,
});

const toAcceptance = (row: AcceptanceRow): PolicyAcceptance => ({
  userId: row.user_id,
  slug: row.slug,
  version: row.version,
  context: row.context,
  relatedId: row.related_id,
  acceptedAt: row.accepted_at,
});

export const postgresContentRepository = (): ContentRepository => ({
  async latest(slug) {
    return withScope(null, async (tx) => {
      const rows = await tx<PageRow[]>`
        select slug, version, kind, title, summary, body, status, requires_acceptance,
               to_char(effective_on, 'YYYY-MM-DD') as effective_on, published_at
          from content_pages
         where slug = ${slug} and status <> 'RETIRED'
         order by version desc
         limit 1
      `;
      return rows[0] ? toPage(rows[0]) : null;
    });
  },

  async list(kind) {
    return withScope(null, async (tx) => {
      const rows = await tx<PageRow[]>`
        select distinct on (slug) slug, version, kind, title, summary, body, status, requires_acceptance,
               to_char(effective_on, 'YYYY-MM-DD') as effective_on, published_at
          from content_pages
         where kind = ${kind} and status <> 'RETIRED'
         order by slug, version desc
      `;
      return rows.map(toPage).sort((a, b) => a.title.localeCompare(b.title));
    });
  },

  async recordAcceptance(input) {
    return withUser(input.userId, async (tx) => {
      await tx`
        insert into policy_acceptances (user_id, slug, version, context, related_id)
        values (${input.userId}, ${input.slug}, ${input.version}, ${input.context}, ${input.relatedId})
        on conflict do nothing
      `;
      const rows = await tx<AcceptanceRow[]>`
        select user_id, slug, version, context, related_id, accepted_at
          from policy_acceptances
         where user_id = ${input.userId} and slug = ${input.slug} and version = ${input.version}
           and context = ${input.context}
           and coalesce(related_id, '00000000-0000-0000-0000-000000000000'::uuid)
             = coalesce(${input.relatedId}::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
         limit 1
      `;
      return toAcceptance(rows[0]!);
    });
  },

  async acceptances(userId) {
    return withUser(userId, async (tx) => {
      const rows = await tx<AcceptanceRow[]>`
        select user_id, slug, version, context, related_id, accepted_at
          from policy_acceptances
         where user_id = ${userId}
         order by accepted_at desc
      `;
      return rows.map(toAcceptance);
    });
  },

  async submitSupportRequest(input) {
    const insert = async (tx: postgres.TransactionSql) => {
      const rows = await tx<{ id: string }[]>`
        insert into support_requests (user_id, email, topic, message, listing_id, client_ref)
        values (${input.userId}, ${input.email}, ${input.topic}, ${input.message}, ${input.listingId}, ${input.clientRef})
        on conflict (client_ref) do nothing
        returning id
      `;
      return { id: rows[0]?.id ?? null };
    };
    return input.userId ? withUser(input.userId, insert) : withScope(null, insert);
  },
});
