import {
  InvalidRepresentationTransitionError,
  RepresentationForbiddenError,
} from './agent-errors.ts';

export type RepresentationState = 'PENDING' | 'ACTIVE' | 'ENDED';

export type RepresentationAction = 'ACCEPT' | 'DECLINE' | 'END';

export type RepresentationActor = 'OWNER' | 'AGENT';

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
): RepresentationState {
  if (action === 'ACCEPT' || action === 'DECLINE') {
    if (actor !== 'AGENT') {
      throw new InvalidRepresentationTransitionError('Only the invited agent can respond to an invitation');
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
