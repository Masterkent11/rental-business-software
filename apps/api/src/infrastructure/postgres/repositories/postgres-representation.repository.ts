import type postgres from 'postgres';
import type { RepresentationRepository } from '@/application/ports/repositories/representation-repository.port.ts';
import type {
  Representation,
  RepresentationActor,
  RepresentationKind,
  RepresentationState,
  RepresentationTerms,
} from '@/domain/agents/agent.ts';
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
  representation_type: string;
  is_primary: boolean;
  accepts_leads: boolean;
  valid_from: Date | null;
  valid_until: Date | null;
  initiated_by: string;
  end_reason: string | null;
  invited_at: Date;
  responded_at: Date | null;
  ended_at: Date | null;
}

const SELECT = (tx: postgres.TransactionSql) => tx`
  select
    r.id, r.organization_id, o.trading_name as organization_name,
    r.listing_id, l.title as listing_title, l.intent as listing_intent, l.state as listing_state,
    (select m.storage_url from media_assets m
      where m.listing_id = r.listing_id and m.kind = 'PHOTO' and m.representation_id is null
      order by m.position limit 1) as listing_photo,
    p.area_label, p.city_label,
    r.agent_id, a.display_name as agent_name,
    r.state, r.can_edit_listing, r.can_manage_tour, r.can_view_commercial,
    r.representation_type, r.is_primary, r.accepts_leads, r.valid_from, r.valid_until,
    r.initiated_by, r.end_reason,
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
  terms: {
    representationType: row.representation_type as RepresentationKind,
    isPrimary: row.is_primary,
    acceptsLeads: row.accepts_leads,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
  },
  initiatedBy: row.initiated_by as RepresentationActor,
  endReason: row.end_reason,
  invitedAt: row.invited_at,
  respondedAt: row.responded_at,
  endedAt: row.ended_at,
});

const UNIQUE_VIOLATION = '23505';

async function loadInScope(tx: postgres.TransactionSql, id: string): Promise<Representation> {
  const [row] = await tx<RepresentationRow[]>`${SELECT(tx)} where r.id = ${id}`;
  return toRepresentation(row!);
}

const CONFLICTS: Readonly<Record<string, string>> = {
  listing_representations_agent_current: 'This agent already represents this property or has a pending request.',
  listing_representations_one_exclusive: 'Another agent already holds the exclusive mandate for this property.',
  listing_representations_one_primary: 'This property already has a primary representative.',
};

const translateConflict = (error: unknown): never => {
  const failure = error as { code?: string; constraint_name?: string; constraint?: string };
  if (failure.code === UNIQUE_VIOLATION) {
    const message = CONFLICTS[failure.constraint_name ?? failure.constraint ?? ''];
    throw new ListingAlreadyRepresentedError(message ?? 'This property already has a conflicting representation.');
  }
  throw error;
};

async function insertRepresentation(
  tx: postgres.TransactionSql,
  input: {
    readonly organizationId: string;
    readonly listingId: string;
    readonly agentId: string;
    readonly permissions: Representation['permissions'];
    readonly terms: RepresentationTerms;
    readonly initiatedBy: RepresentationActor;
    readonly invitedBy: string;
  },
): Promise<Representation> {
  const [row] = await tx<{ id: string }[]>`
    insert into listing_representations (
      organization_id, listing_id, agent_id, state,
      can_edit_listing, can_manage_tour, can_view_commercial,
      representation_type, is_primary, accepts_leads, valid_from, valid_until,
      initiated_by, invited_by
    ) values (
      ${input.organizationId}, ${input.listingId}, ${input.agentId}, 'PENDING',
      ${input.permissions.canEditListing}, ${input.permissions.canManageTour}, ${input.permissions.canViewCommercial},
      ${input.terms.representationType}, ${input.terms.isPrimary}, ${input.terms.acceptsLeads},
      ${input.terms.validFrom}, ${input.terms.validUntil},
      ${input.initiatedBy}, ${input.invitedBy}
    )
    returning id
  `;
  return loadInScope(tx, row!.id);
}

export const postgresRepresentationRepository = (): RepresentationRepository => ({
  async invite(input) {
    try {
      return await withScope(input.organizationId, (tx) =>
        insertRepresentation(tx, { ...input, initiatedBy: 'OWNER' }),
      );
    } catch (error) {
      return translateConflict(error);
    }
  },

  async requestByAgent(input) {
    try {
      return await withUserAndScope(input.agentUserId, input.organizationId, (tx) =>
        insertRepresentation(tx, {
          organizationId: input.organizationId,
          listingId: input.listingId,
          agentId: input.agentId,
          permissions: input.permissions,
          terms: input.terms,
          initiatedBy: 'AGENT',
          invitedBy: input.agentUserId,
        }),
      );
    } catch (error) {
      return translateConflict(error);
    }
  },

  async listForListing(organizationId, listingId) {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<RepresentationRow[]>`
        ${SELECT(tx)}
        where r.listing_id = ${listingId} and r.organization_id = ${organizationId}
        order by (r.state = 'ENDED'), r.is_primary desc, r.invited_at desc
      `;
      return rows.map(toRepresentation);
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

  async respond({ responderUserId, representation, accept }) {
    try {
      return await withUserAndScope(responderUserId, representation.organizationId, async (tx) => {
        await tx`
          update listing_representations set
            state = ${accept ? 'ACTIVE' : 'ENDED'},
            responded_at = now(),
            ended_at = ${accept ? null : tx`now()`},
            ended_by = ${accept ? null : responderUserId},
            end_reason = ${accept ? null : 'Declined'}
          where id = ${representation.id} and state = 'PENDING'
        `;
        return loadInScope(tx, representation.id);
      });
    } catch (error) {
      return translateConflict(error);
    }
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
      return loadInScope(tx, representation.id);
    });
  },

  async updateTerms(organizationId, id, terms) {
    try {
      return await withScope(organizationId, async (tx) => {
        const updated = await tx`
          update listing_representations set
            representation_type = ${terms.representationType},
            is_primary = ${terms.isPrimary},
            accepts_leads = ${terms.acceptsLeads},
            valid_from = ${terms.validFrom},
            valid_until = ${terms.validUntil}
          where id = ${id} and organization_id = ${organizationId} and state in ('PENDING', 'ACTIVE')
          returning id
        `;
        if (updated.length === 0) return null;
        return loadInScope(tx, id);
      });
    } catch (error) {
      return translateConflict(error);
    }
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
