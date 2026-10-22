import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { RepresentationRepository } from '@/application/ports/repositories/representation-repository.port.ts';
import type { LeadAssignmentRepository } from '@/application/ports/repositories/lead-assignment-repository.port.ts';
import type { reassignLead } from '@/application/assignment/reassign-lead/reassign-lead.use-case.ts';
import {
  AgentNotAssignableError,
  AgentProfileNotFoundError,
  DEFAULT_PERMISSIONS,
  DEFAULT_TERMS,
  RepresentationNotFoundError,
  assertValidTerms,
  isAssignable,
  nextRepresentationState,
  type Representation,
  type RepresentationPermissions,
  type RepresentationTerms,
} from '@/domain/agents/agent.ts';
import { ListingNotFoundError } from '@/domain/listings/listing.ts';
import { PUBLIC } from '@/domain/shared/organization-scope.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export const inviteAgentToListing =
  (
    representations: RepresentationRepository,
    agents: AgentRepository,
    listings: ListingRepository,
    notifications: NotificationRepository,
  ) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly listingId: string;
    readonly agentId: string;
    readonly permissions: Partial<RepresentationPermissions>;
    readonly terms: Partial<RepresentationTerms>;
  }): Promise<Representation> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const terms = assertValidTerms({ ...DEFAULT_TERMS, ...input.terms });
    const listing = await listings.findById(input.organizationId, input.listingId);
    if (!listing) throw new ListingNotFoundError('Listing not found');
    if (listing.state === 'ARCHIVED') throw new AgentNotAssignableError('Archived listings cannot be assigned');
    const agent = await agents.findPublic(input.agentId);
    if (!agent) throw new AgentProfileNotFoundError('Agent not found');
    if (!isAssignable(agent)) throw new AgentNotAssignableError('Only verified agents can be assigned');
    if (agent.userId === input.principal.userId) {
      throw new AgentNotAssignableError('You already manage this listing as its owner');
    }

    const representation = await representations.invite({
      organizationId: input.organizationId,
      listingId: input.listingId,
      agentId: agent.id,
      permissions: { ...DEFAULT_PERMISSIONS, ...input.permissions },
      terms,
      invitedBy: input.principal.userId,
    });
    await notifications.publish([
      {
        audience: { userId: agent.userId },
        kind: 'REPRESENTATION_INVITED',
        title: `${representation.organizationName} invited you to represent a listing`,
        body: listing.title,
        link: '/agent/properties',
      },
    ]);
    return representation;
  };

export const requestRepresentation =
  (
    representations: RepresentationRepository,
    agents: AgentRepository,
    listings: ListingRepository,
    notifications: NotificationRepository,
  ) =>
  async (input: { readonly principal: Principal; readonly listingId: string }): Promise<Representation> => {
    const agent = await agents.findByUser(input.principal.userId);
    if (!agent) throw new AgentProfileNotFoundError('Create your agent profile first');
    if (!isAssignable(agent)) throw new AgentNotAssignableError('Only verified agents can represent a property');
    const listing = await listings.findPublicById(PUBLIC, input.listingId);
    if (!listing || listing.state !== 'PUBLISHED' || listing.intent !== 'SALE') {
      throw new ListingNotFoundError('That property is not open for representation');
    }
    const representation = await representations.requestByAgent({
      agentUserId: input.principal.userId,
      agentId: agent.id,
      organizationId: listing.organizationId,
      listingId: listing.id,
      permissions: DEFAULT_PERMISSIONS,
      terms: DEFAULT_TERMS,
    });
    await notifications.publish([
      {
        audience: { organizationId: listing.organizationId },
        kind: 'REPRESENTATION_INVITED',
        title: `${agent.displayName} asked to represent your property`,
        body: listing.title,
        link: `/properties/${listing.id}`,
      },
    ]);
    return representation;
  };

export const respondToRepresentation =
  (representations: RepresentationRepository, notifications: NotificationRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly representationId: string;
    readonly accept: boolean;
  }): Promise<Representation> => {
    const current = await representations.findForAgent(input.principal.userId, input.representationId);
    if (!current) throw new RepresentationNotFoundError('Invitation not found');
    nextRepresentationState(current.state, input.accept ? 'ACCEPT' : 'DECLINE', 'AGENT', current.initiatedBy);
    const updated = await representations.respond({
      responderUserId: input.principal.userId,
      representation: current,
      accept: input.accept,
    });
    await notifications.publish([
      {
        audience: { organizationId: current.organizationId },
        kind: 'REPRESENTATION_UPDATED',
        title: input.accept
          ? `${current.agentName} now represents your listing`
          : `${current.agentName} declined to represent your listing`,
        body: current.listingTitle,
        link: `/properties/${current.listingId}`,
      },
    ]);
    return updated;
  };

export const decideRepresentationRequest =
  (representations: RepresentationRepository, agents: AgentRepository, notifications: NotificationRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly representationId: string;
    readonly accept: boolean;
  }): Promise<Representation> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const current = await representations.findForOrganization(input.organizationId, input.representationId);
    if (!current) throw new RepresentationNotFoundError('Request not found');
    nextRepresentationState(current.state, input.accept ? 'ACCEPT' : 'DECLINE', 'OWNER', current.initiatedBy);
    const updated = await representations.respond({
      responderUserId: input.principal.userId,
      representation: current,
      accept: input.accept,
    });
    const agent = await agents.findPublic(current.agentId);
    if (agent) {
      await notifications.publish([
        {
          audience: { userId: agent.userId },
          kind: 'REPRESENTATION_UPDATED',
          title: input.accept
            ? `${current.organizationName} approved your representation`
            : `${current.organizationName} declined your representation request`,
          body: current.listingTitle,
          link: '/agent/properties',
        },
      ]);
    }
    return updated;
  };

export const endRepresentation =
  (deps: {
    readonly representations: RepresentationRepository;
    readonly agents: AgentRepository;
    readonly assignments: LeadAssignmentRepository;
    readonly notifications: NotificationRepository;
    readonly reassign: ReturnType<typeof reassignLead>;
  }) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string | null;
    readonly representationId: string;
    readonly reason: string | null;
  }): Promise<Representation> => {
    let current: Representation | null;
    if (input.organizationId) {
      assertMayManageOrganization(input.principal, input.organizationId);
      current = await deps.representations.findForOrganization(input.organizationId, input.representationId);
    } else {
      current = await deps.representations.findForAgent(input.principal.userId, input.representationId);
    }
    if (!current) throw new RepresentationNotFoundError('Representation not found');
    nextRepresentationState(current.state, 'END', input.organizationId ? 'OWNER' : 'AGENT');

    const updated = await deps.representations.end({
      representation: current,
      endedBy: input.principal.userId,
      reason: input.reason?.trim().slice(0, 300) || null,
    });

    const leads = await deps.assignments.activeForRepresentation(current.organizationId, current.id);
    for (const assignment of leads) {
      await deps.reassign({
        organizationId: current.organizationId,
        assignment,
        releaseReason: 'REPRESENTATION_ENDED',
        viewingStatusWithoutAgent: 'MATCHING',
      });
    }

    if (input.organizationId) {
      const agent = await deps.agents.findPublic(current.agentId);
      if (agent) {
        await deps.notifications.publish([
          {
            audience: { userId: agent.userId },
            kind: 'REPRESENTATION_UPDATED',
            title: `${current.organizationName} ended your representation`,
            body: current.listingTitle,
            link: '/agent/properties',
          },
        ]);
      }
    } else {
      await deps.notifications.publish([
        {
          audience: { organizationId: current.organizationId },
          kind: 'REPRESENTATION_UPDATED',
          title: `${current.agentName} stopped representing your listing`,
          body: current.listingTitle,
          link: `/properties/${current.listingId}`,
        },
      ]);
    }
    return updated;
  };

export const updateRepresentationTerms =
  (representations: RepresentationRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly representationId: string;
    readonly terms: RepresentationTerms;
  }): Promise<Representation> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const updated = await representations.updateTerms(
      input.organizationId,
      input.representationId,
      assertValidTerms(input.terms),
    );
    if (!updated) throw new RepresentationNotFoundError('Representation not found');
    return updated;
  };

export const updateRepresentationPermissions =
  (representations: RepresentationRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly representationId: string;
    readonly permissions: RepresentationPermissions;
  }): Promise<Representation> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const updated = await representations.updatePermissions(
      input.organizationId,
      input.representationId,
      input.permissions,
    );
    if (!updated) throw new RepresentationNotFoundError('Representation not found');
    return updated;
  };

export const listOrganizationRepresentations =
  (representations: RepresentationRepository) =>
  async (input: { readonly principal: Principal; readonly organizationId: string }): Promise<readonly Representation[]> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    return representations.listForOrganization(input.organizationId);
  };

export const listAgentRepresentations =
  (representations: RepresentationRepository) =>
  async (input: { readonly principal: Principal }): Promise<readonly Representation[]> =>
    representations.listForAgent(input.principal.userId);
