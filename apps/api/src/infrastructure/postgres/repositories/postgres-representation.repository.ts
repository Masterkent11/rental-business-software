import type postgres from 'postgres';
import type { RepresentationRepository } from '@/application/ports/repositories/representation-repository.port.ts';
import type { Representation, RepresentationState } from '@/domain/agents/agent.ts';
import { ListingAlreadyRepresentedError } from '@/domain/agents/agent.ts';
import { withScope, withUser, withUserAndScope } from '@/infrastructure/postgres/db.ts';

interface RepresentationRow {
  id: string;
  organization_id: string;
  organization_name: string;
  listing_id: string;
  listing_title: string | null;
  listing_intent: string | null;
  listing_state: string | null;
  listing_photo: string | null;
  area_label: string | null;
  city_label: string | null;
  agent_id: string;
  agent_name: string | null;
  state: string;
  can_edit_listing: boolean;
  can_manage_tour: boolean;
  can_view_commercial: boolean;
  invited_at: Date;
  responded_at: Date | null;
  ended_at: Date | null;
}

const SELECT = (tx: postgres.TransactionSql) => tx`
  select
    r.id, r.organization_id, o.trading_name as organization_name,
    r.listing_id, l.title as listing_title, l.intent as listing_intent, l.state as listing_state,
    (select m.storage_url from media_assets m
      where m.listing_id = r.listing_id and m.kind = 'PHOTO'
      order by m.position limit 1) as listing_photo,
    p.area_label, p.city_label,
    r.agent_id, a.display_name as agent_name,
    r.state, r.can_edit_listing, r.can_manage_tour, r.can_view_commercial,
    r.invited_at, r.responded_at, r.ended_at
  from listing_representations r
  join organizations o on o.id = r.organization_id
  left join listings l on l.id = r.listing_id
  left join rentable_resources rr on rr.id = l.resource_id
  left join properties p on p.id = rr.property_id
  left join agent_profiles a on a.id = r.agent_id
`;

const toRepresentation = (row: RepresentationRow): Representation => ({
  id: row.id,
  organizationId: row.organization_id,
  organizationName: row.organization_name,
  listingId: row.listing_id,
  listingTitle: row.listing_title ?? 'Listing no longer available',
  listingIntent: row.listing_intent === 'SALE' ? 'SALE' : 'RENT',
  listingState: row.listing_state ?? 'UNAVAILABLE',
  listingPhoto: row.listing_photo,
  areaLabel: row.area_label ?? '',
  cityLabel: row.city_label ?? '',
  agentId: row.agent_id,
  agentName: row.agent_name?.trim() || 'Agent',
  state: row.state as RepresentationState,
  permissions: {
    canEditListing: row.can_edit_listing,
    canManageTour: row.can_manage_tour,
    canViewCommercial: row.can_view_commercial,
  },
  invitedAt: row.invited_at,
  respondedAt: row.responded_at,
  endedAt: row.ended_at,
});

const UNIQUE_VIOLATION = '23505';

async function loadInScope(tx: postgres.TransactionSql, id: string): Promise<Representation> {
  const [row] = await tx<RepresentationRow[]>`${SELECT(tx)} where r.id = ${id}`;
  return toRepresentation(row!);
}

async function assignAgent(tx: postgres.TransactionSql, listingId: string, agentId: string): Promise<void> {
  await tx`update conversations set agent_id = ${agentId} where listing_id = ${listingId}`;
  await tx`
    update inquiries set agent_id = ${agentId}, updated_at = now()
     where listing_id = ${listingId} and status not in ('CLOSED', 'LOST')
  `;
  await tx`
    update viewings set agent_id = ${agentId}, updated_at = now()
     where listing_id = ${listingId} and status in ('REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED')
  `;
}

async function unassignAgent(tx: postgres.TransactionSql, listingId: string, agentId: string): Promise<void> {
  await tx`update conversations set agent_id = null where listing_id = ${listingId} and agent_id = ${agentId}`;
  await tx`
    update inquiries set agent_id = null, updated_at = now()
     where listing_id = ${listingId} and agent_id = ${agentId} and status not in ('CLOSED', 'LOST')
  `;
  await tx`
    update viewings set agent_id = null, updated_at = now()
     where listing_id = ${listingId} and agent_id = ${agentId}
       and status in ('REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED')
  `;
}

export const postgresRepresentationRepository = (): RepresentationRepository => ({
  async invite(input) {
    return withScope(input.organizationId, async (tx) => {
      try {
        const [row] = await tx<{ id: string }[]>`
          insert into listing_representations (
            organization_id, listing_id, agent_id, state,
            can_edit_listing, can_manage_tour, can_view_commercial, invited_by
          ) values (
            ${input.organizationId}, ${input.listingId}, ${input.agentId}, 'PENDING',
            ${input.permissions.canEditListing}, ${input.permissions.canManageTour},
            ${input.permissions.canViewCommercial}, ${input.invitedBy}
          )
          returning id
        `;
        return loadInScope(tx, row!.id);
      } catch (error) {
        if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
          throw new ListingAlreadyRepresentedError(
            'This listing already has an agent or a pending invitation. End it before inviting someone else.',
          );
        }
        throw error;
      }
    });
  },

  async currentForListing(organizationId, listingId) {
    return withScope(organizationId, async (tx) => {
      const [row] = await tx<RepresentationRow[]>`
        ${SELECT(tx)}
        where r.listing_id = ${listingId} and r.organization_id = ${organizationId}
          and r.state in ('PENDING', 'ACTIVE')
        limit 1
      `;
      return row ? toRepresentation(row) : null;
    });
  },

  async listForOrganization(organizationId) {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<RepresentationRow[]>`
        ${SELECT(tx)}
        where r.organization_id = ${organizationId}
        order by (r.state = 'ENDED'), r.invited_at desc
        limit 200
      `;
      return rows.map(toRepresentation);
    });
  },

  async findForOrganization(organizationId, id) {
    return withScope(organizationId, async (tx) => {
      const [row] = await tx<RepresentationRow[]>`
        ${SELECT(tx)} where r.id = ${id} and r.organization_id = ${organizationId}
      `;
      return row ? toRepresentation(row) : null;
    });
  },

  async listForAgent(agentUserId) {
    return withUser(agentUserId, async (tx) => {
      const rows = await tx<RepresentationRow[]>`
        ${SELECT(tx)}
        where r.agent_id = app_private.current_app_agent()
        order by case r.state when 'PENDING' then 0 when 'ACTIVE' then 1 else 2 end, r.invited_at desc
        limit 200
      `;
      return rows.map(toRepresentation);
    });
  },

  async findForAgent(agentUserId, id) {
    return withUser(agentUserId, async (tx) => {
      const [row] = await tx<RepresentationRow[]>`
        ${SELECT(tx)} where r.id = ${id} and r.agent_id = app_private.current_app_agent()
      `;
      return row ? toRepresentation(row) : null;
    });
  },

  async currentForAgentListing(agentUserId, listingId) {
    return withUser(agentUserId, async (tx) => {
      const [row] = await tx<RepresentationRow[]>`
        ${SELECT(tx)}
        where r.listing_id = ${listingId}
          and r.agent_id = app_private.current_app_agent()
          and r.state in ('PENDING', 'ACTIVE')
        limit 1
      `;
      return row ? toRepresentation(row) : null;
    });
  },

  async currentForAgentTour(agentUserId, tourId) {
    return withUser(agentUserId, async (tx) => {
      const [row] = await tx<RepresentationRow[]>`
        ${SELECT(tx)}
        where r.agent_id = app_private.current_app_agent()
          and r.state = 'ACTIVE'
          and exists (
            select 1 from virtual_tours t
             where t.id = ${tourId} and t.resource_id = l.resource_id
          )
        limit 1
      `;
      return row ? toRepresentation(row) : null;
    });
  },

  async currentForAgentResource(agentUserId, resourceId) {
    return withUser(agentUserId, async (tx) => {
      const [row] = await tx<RepresentationRow[]>`
        ${SELECT(tx)}
        where r.agent_id = app_private.current_app_agent()
          and r.state = 'ACTIVE'
          and l.resource_id = ${resourceId}
        limit 1
      `;
      return row ? toRepresentation(row) : null;
    });
  },

  async respond({ agentUserId, representation, accept }) {
    return withUserAndScope(agentUserId, representation.organizationId, async (tx) => {
      await tx`
        update listing_representations set
          state = ${accept ? 'ACTIVE' : 'ENDED'},
          responded_at = now(),
          ended_at = ${accept ? null : tx`now()`},
          ended_by = ${accept ? null : agentUserId},
          end_reason = ${accept ? null : 'Declined by the agent'}
        where id = ${representation.id} and state = 'PENDING'
      `;
      if (accept) await assignAgent(tx, representation.listingId, representation.agentId);
      return loadInScope(tx, representation.id);
    });
  },

  async end({ representation, endedBy, reason }) {
    return withScope(representation.organizationId, async (tx) => {
      await tx`
        update listing_representations set
          state = 'ENDED',
          ended_at = now(),
          ended_by = ${endedBy},
          end_reason = ${reason}
        where id = ${representation.id} and state in ('PENDING', 'ACTIVE')
      `;
      await unassignAgent(tx, representation.listingId, representation.agentId);
      return loadInScope(tx, representation.id);
    });
  },

  async updatePermissions(organizationId, id, permissions) {
    return withScope(organizationId, async (tx) => {
      const updated = await tx`
        update listing_representations set
          can_edit_listing = ${permissions.canEditListing},
          can_manage_tour = ${permissions.canManageTour},
          can_view_commercial = ${permissions.canViewCommercial}
        where id = ${id} and organization_id = ${organizationId} and state in ('PENDING', 'ACTIVE')
        returning id
      `;
      if (updated.length === 0) return null;
      return loadInScope(tx, id);
    });
  },
});
