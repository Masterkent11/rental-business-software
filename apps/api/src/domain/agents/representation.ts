import {
  InvalidRepresentationTransitionError,
  RepresentationForbiddenError,
} from './agent-errors.ts';

export type RepresentationState = 'PENDING' | 'ACTIVE' | 'ENDED';

export type RepresentationAction = 'ACCEPT' | 'DECLINE' | 'END';

export type RepresentationActor = 'OWNER' | 'AGENT';

export type RepresentationKind = 'EXCLUSIVE' | 'NON_EXCLUSIVE' | 'OWNER_DIRECT';

export interface RepresentationTerms {
  readonly representationType: RepresentationKind;
  readonly isPrimary: boolean;
  readonly acceptsLeads: boolean;
  readonly validFrom: Date | null;
  readonly validUntil: Date | null;
}

export const DEFAULT_TERMS: RepresentationTerms = {
  representationType: 'NON_EXCLUSIVE',
  isPrimary: false,
  acceptsLeads: true,
  validFrom: null,
  validUntil: null,
};

export interface RepresentationPermissions {
  readonly canEditListing: boolean;
  readonly canManageTour: boolean;
  readonly canViewCommercial: boolean;
}

export type RepresentationPermission = keyof RepresentationPermissions;

export interface Representation {
  readonly id: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly listingIntent: 'RENT' | 'SALE';
  readonly listingState: string;
  readonly listingPhoto: string | null;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly agentId: string;
  readonly agentName: string;
  readonly state: RepresentationState;
  readonly permissions: RepresentationPermissions;
  readonly terms: RepresentationTerms;
  readonly initiatedBy: RepresentationActor;
  readonly endReason: string | null;
  readonly invitedAt: Date;
  readonly respondedAt: Date | null;
  readonly endedAt: Date | null;
}

export const DEFAULT_PERMISSIONS: RepresentationPermissions = {
  canEditListing: false,
  canManageTour: true,
  canViewCommercial: true,
};

export function nextRepresentationState(
  current: RepresentationState,
  action: RepresentationAction,
  actor: RepresentationActor,
  initiatedBy: RepresentationActor = 'OWNER',
): RepresentationState {
  if (action === 'ACCEPT' || action === 'DECLINE') {
    if (actor === initiatedBy) {
      throw new InvalidRepresentationTransitionError(
        initiatedBy === 'OWNER'
          ? 'Only the invited agent can respond to an invitation'
          : 'Only the listing owner can respond to a representation request',
      );
    }
    if (current !== 'PENDING') {
      throw new InvalidRepresentationTransitionError('This invitation has already been answered');
    }
    return action === 'ACCEPT' ? 'ACTIVE' : 'ENDED';
  }
  if (current === 'ENDED') {
    throw new InvalidRepresentationTransitionError('This representation has already ended');
  }
  return 'ENDED';
}

export function assertValidTerms(terms: RepresentationTerms): RepresentationTerms {
  if (terms.validFrom && terms.validUntil && terms.validUntil.getTime() <= terms.validFrom.getTime()) {
    throw new InvalidRepresentationTransitionError('The representation must end after it starts');
  }
  return terms;
}

export function assertActiveRepresentationAllows(
  representation: Pick<Representation, 'state' | 'permissions'> | null,
  permission: RepresentationPermission | null,
): void {
  if (!representation || representation.state !== 'ACTIVE') {
    throw new RepresentationForbiddenError('You do not represent this listing');
  }
  if (permission && !representation.permissions[permission]) {
    throw new RepresentationForbiddenError('The owner has not given you permission for that');
  }
}
