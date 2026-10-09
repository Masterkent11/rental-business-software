import type {
  Representation,
  RepresentationPermissions,
} from '@/domain/agents/agent.ts';

export interface RepresentationRepository {
  invite(input: {
    readonly organizationId: string;
    readonly listingId: string;
    readonly agentId: string;
    readonly permissions: RepresentationPermissions;
    readonly invitedBy: string;
  }): Promise<Representation>;
  currentForListing(organizationId: string, listingId: string): Promise<Representation | null>;
  listForOrganization(organizationId: string): Promise<readonly Representation[]>;
  findForOrganization(organizationId: string, id: string): Promise<Representation | null>;
  listForAgent(agentUserId: string): Promise<readonly Representation[]>;
  findForAgent(agentUserId: string, id: string): Promise<Representation | null>;
  currentForAgentListing(agentUserId: string, listingId: string): Promise<Representation | null>;
  currentForAgentTour(agentUserId: string, tourId: string): Promise<Representation | null>;
  currentForAgentResource(agentUserId: string, resourceId: string): Promise<Representation | null>;
  respond(input: {
    readonly agentUserId: string;
    readonly representation: Representation;
    readonly accept: boolean;
  }): Promise<Representation>;
  end(input: {
    readonly representation: Representation;
    readonly endedBy: string;
    readonly reason: string | null;
  }): Promise<Representation>;
  updatePermissions(
    organizationId: string,
    id: string,
    permissions: RepresentationPermissions,
  ): Promise<Representation | null>;
}
