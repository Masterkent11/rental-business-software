import type postgres from 'postgres';
import type { ListingChangeProposalRepository } from '@/application/ports/repositories/listing-change-proposal-repository.port.ts';
import type { CanonicalChanges, ChangeProposalStatus, ListingChangeProposal } from '@/domain/listings/listing.ts';
import { withScope, withUserAndScope } from '@/infrastructure/postgres/db.ts';

interface ProposalRow {
  id: string;
  organization_id: string;
  listing_id: string;
  listing_title: string | null;
  proposed_by_agent: string;
  agent_name: string | null;
  changes: CanonicalChanges;
  status: string;
  created_at: Date;
  decided_at: Date | null;
}

const SELECT = (tx: postgres.TransactionSql) => tx`
  select p.id, p.organization_id, p.listing_id, l.title as listing_title, p.proposed_by_agent,
         a.display_name as agent_name, p.changes, p.status, p.created_at, p.decided_at
    from listing_change_proposals p
    left join listings l on l.id = p.listing_id
    left join agent_profiles a on a.id = p.proposed_by_agent
`;

const toProposal = (row: ProposalRow): ListingChangeProposal => ({
  id: row.id,
  organizationId: row.organization_id,
  listingId: row.listing_id,
  listingTitle: row.listing_title ?? 'Listing no longer available',
  proposedByAgentId: row.proposed_by_agent,
  agentName: row.agent_name?.trim() || 'Agent',
  changes: { listing: row.changes.listing ?? {}, property: row.changes.property ?? {} },
  status: row.status as ChangeProposalStatus,
  createdAt: row.created_at,
  decidedAt: row.decided_at,
});

export const postgresListingChangeProposalRepository = (): ListingChangeProposalRepository => ({
  async propose(input) {
    return withUserAndScope(input.agentUserId, input.organizationId, async (tx) => {
      const [created] = await tx<{ id: string }[]>`
        insert into listing_change_proposals (organization_id, listing_id, proposed_by_agent, changes)
        values (${input.organizationId}, ${input.listingId}, app_private.current_app_agent(), ${tx.json(input.changes as never)})
        returning id
      `;
      const [row] = await tx<ProposalRow[]>`${SELECT(tx)} where p.id = ${created!.id}`;
      return toProposal(row!);
    });
  },

  async listPending(organizationId) {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<ProposalRow[]>`
        ${SELECT(tx)}
        where p.organization_id = ${organizationId} and p.status = 'PENDING'
        order by p.created_at desc
        limit 200
      `;
      return rows.map(toProposal);
    });
  },

  async findInOrganization(organizationId, id) {
    return withScope(organizationId, async (tx) => {
      const [row] = await tx<ProposalRow[]>`${SELECT(tx)} where p.id = ${id} and p.organization_id = ${organizationId}`;
      return row ? toProposal(row) : null;
    });
  },

  async decide(organizationId, id, status, decidedBy) {
    return withScope(organizationId, async (tx) => {
      const updated = await tx<{ id: string }[]>`
        update listing_change_proposals set status = ${status}, decided_at = now(), decided_by = ${decidedBy}
         where id = ${id} and organization_id = ${organizationId} and status = 'PENDING'
        returning id
      `;
      if (updated.length === 0) return null;
      const [row] = await tx<ProposalRow[]>`${SELECT(tx)} where p.id = ${id}`;
      return toProposal(row!);
    });
  },
});
