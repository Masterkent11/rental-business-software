import type { Principal } from '@/domain/identity/identity.ts';
import { hasCapability } from '@/domain/identity/identity.ts';
import { OrganizationForbiddenError } from './resolve-principal/resolve-principal.use-case.ts';

export function assertMayManageOrganization(
  principal: Principal,
  organizationId: string,
): void {
  const allowed =
    hasCapability(principal, 'OWNER', organizationId) ||
    hasCapability(principal, 'STAFF', organizationId);

  if (!allowed) {
    throw new OrganizationForbiddenError('Only owners and staff may manage this organization');
  }
}

export function assertMayDecideApplications(
  principal: Principal,
  organizationId: string,
): void {
  const allowed =
    hasCapability(principal, 'OWNER', organizationId) ||
    hasCapability(principal, 'STAFF', organizationId);

  if (!allowed) {
    throw new OrganizationForbiddenError('You may not decide applications here');
  }
}

export function assertMaySeeMoney(
  principal: Principal,
  organizationId: string,
): void {
  const allowed =
    hasCapability(principal, 'OWNER', organizationId) ||
    hasCapability(principal, 'STAFF', organizationId);

  if (!allowed) {
    throw new OrganizationForbiddenError('You may not see this organization’s money');
  }
}

export function assertMayAuthorTours(
  principal: Principal,
  organizationId: string,
): void {
  const allowed =
    hasCapability(principal, 'OWNER', organizationId) ||
    hasCapability(principal, 'STAFF', organizationId);

  if (!allowed) {
    throw new OrganizationForbiddenError('You may not author tours here');
  }
}
