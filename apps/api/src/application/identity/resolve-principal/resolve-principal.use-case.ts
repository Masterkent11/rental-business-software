import type { IdentityProvider } from '@/application/ports/providers/identity-provider.port.ts';
import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';
import { hasCapability, type Principal } from '@/domain/identity/identity.ts';

export type { Principal };

export class UnauthenticatedError extends Error {}
export class OrganizationForbiddenError extends Error {}

export interface ResolvePrincipalInput {
  readonly authorization: string | undefined;
  readonly organizationId: string | null;
  readonly requiredCapability?: 'AGENT';
}

/**
 * Turn a bearer token into an application Principal.
 */
export const resolvePrincipal =
  (identity: IdentityProvider, users: UserRepository) =>
  async (input: ResolvePrincipalInput): Promise<Principal> => {
    const token = bearerFrom(input.authorization);
    if (!token) throw new UnauthenticatedError('Missing bearer token');

    const verified = await identity.verify(token);
    if (!verified) throw new UnauthenticatedError('Invalid or expired token');

    let loaded = await users.loadPrincipal(
      verified.userId,
      input.organizationId,
    );

    if (loaded.deactivated) throw new UnauthenticatedError('Your account is unavailable');

    if (!loaded.profile) {
      await users.createProfile({
        id: verified.userId,
        email: verified.email,
        mobile: verified.mobile,
        displayName: verified.displayName ?? null,
      });
      loaded = await users.loadPrincipal(verified.userId, input.organizationId);
    }

    if (!loaded.profile || loaded.deactivated) throw new UnauthenticatedError('Your account is unavailable');

    if (input.requiredCapability && (!loaded.agentAvailable || !hasCapability({ userId: verified.userId, displayName: loaded.profile.displayName, capabilities: loaded.capabilities, organizationId: input.organizationId }, input.requiredCapability))) throw new OrganizationForbiddenError('Your Agent workspace is unavailable');

    if (input.organizationId !== null && loaded.isMember !== true) {
      throw new OrganizationForbiddenError('Not a member of that organization');
    }

    return {
      userId: verified.userId,
      assuranceLevel: verified.assuranceLevel ?? 'aal1',
      displayName: loaded.profile?.displayName ?? '',
      capabilities: loaded.capabilities,
      organizationId: input.organizationId,
    };
  };

function bearerFrom(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  if (!value || scheme?.toLowerCase() !== 'bearer') return null;
  return value.trim() || null;
}
