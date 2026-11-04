import type { RepresentationRepository } from '@/application/ports/repositories/representation-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { PartyScope } from '@/application/ports/repositories/party-scope.port.ts';
import { hasCapability, type Principal } from '@/domain/identity/identity.ts';
import {
  RepresentationForbiddenError,
  assertActiveRepresentationAllows,
  assertRepresentationCurrent,
  type Representation,
  type RepresentationPermission,
} from '@/domain/agents/agent.ts';
import {
  assertMayAuthorTours,
  assertMayManageOrganization,
} from './application-authorization.rules.ts';
import { OrganizationForbiddenError } from './resolve-principal/resolve-principal.use-case.ts';

export interface PartnerAccess {
  readonly organizationId: string;
  readonly role: 'OWNER' | 'AGENT';
  readonly representation: Representation | null;
}

export interface ListingGateInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly listingId: string;
  readonly permission: RepresentationPermission | null;
}

export interface TourGateInput {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly tourId?: string;
  readonly resourceId?: string;
}

export type ListingGate = (input: ListingGateInput) => Promise<PartnerAccess>;
export type TourGate = (input: TourGateInput) => Promise<PartnerAccess>;

export const ownerListingGate: ListingGate = async (input) => {
  if (!input.organizationId) throw new OrganizationForbiddenError('Choose an organization first');
  assertMayManageOrganization(input.principal, input.organizationId);
  return { organizationId: input.organizationId, role: 'OWNER', representation: null };
};

export const ownerTourGate: TourGate = async (input) => {
  if (!input.organizationId) throw new OrganizationForbiddenError('Choose an organization first');
  assertMayAuthorTours(input.principal, input.organizationId);
  return { organizationId: input.organizationId, role: 'OWNER', representation: null };
};

const assertAgent = (principal: Principal) => {
  if (!hasCapability(principal, 'AGENT')) {
    throw new RepresentationForbiddenError('Only agents can do that');
  }
};

export const partnerListingGate =
  (representations: RepresentationRepository, clock: Clock = { now: () => new Date() }): ListingGate =>
  async (input) => {
    if (input.organizationId) return ownerListingGate(input);
    assertAgent(input.principal);
    const representation = await representations.currentForAgentListing(input.principal.userId, input.listingId);
    assertActiveRepresentationAllows(representation, input.permission);
    assertRepresentationCurrent(representation!, clock.now());
    return { organizationId: representation!.organizationId, role: 'AGENT', representation };
  };

export const partnerTourGate =
  (representations: RepresentationRepository, clock: Clock = { now: () => new Date() }): TourGate =>
  async (input) => {
    if (input.organizationId) return ownerTourGate(input);
    assertAgent(input.principal);
    const representation = input.tourId
      ? await representations.currentForAgentTour(input.principal.userId, input.tourId)
      : input.resourceId
        ? await representations.currentForAgentResource(input.principal.userId, input.resourceId)
        : null;
    assertActiveRepresentationAllows(representation, 'canManageTour');
    assertRepresentationCurrent(representation!, clock.now());
    return { organizationId: representation!.organizationId, role: 'AGENT', representation };
  };

export function partnerScopeFor(principal: Principal, organizationId: string | null): PartyScope {
  if (organizationId) {
    assertMayManageOrganization(principal, organizationId);
    return { organizationId };
  }
  assertAgent(principal);
  return { agentUserId: principal.userId };
}

export const partnerRoleOf = (scope: PartyScope): 'OWNER' | 'AGENT' =>
  'agentUserId' in scope ? 'AGENT' : 'OWNER';
