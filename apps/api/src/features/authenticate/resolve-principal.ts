import type { IdentityProvider } from '../../application/ports/identity-provider.ts';
import type { UserRepository } from '../../application/ports/user-repository.ts';
import type { Principal } from '../../domain/identity/capability.ts';

export class UnauthenticatedError extends Error {}
export class OrganizationForbiddenError extends Error {}

/**
 * Turn a bearer token into a principal.
 *
 * The single most important line in this file is the one that is missing: the
 * capabilities are **not** read from the token. They are loaded from the
 * database on every authenticated request (ADR-0007).
 *
 * The cost is one indexed lookup per request. What it buys is revocation that
 * works when it is meant to: a dismissed staff member's next request fails,
 * rather than their hour-old token continuing to authorize cash recordings on
 * the product's most sensitive path.
 */
export const resolvePrincipal =
  (identity: IdentityProvider, users: UserRepository) =>
  async (input: {
    authorization: string | undefined;
    organizationId: string | null;
  }): Promise<Principal> => {
    const token = bearerFrom(input.authorization);
    if (!token) throw new UnauthenticatedError('Missing bearer token');

    const verified = await identity.verify(token);
    if (!verified) throw new UnauthenticatedError('Invalid or expired token');

    // One round trip for the whole principal. Three separate ones cost three
    // times the transaction overhead, which is invisible locally and about
    // 2.5 seconds against a database in another region.
    let loaded = await users.loadPrincipal(
      verified.userId,
      input.organizationId,
    );

    // First authenticated request for a Supabase user creates the platform's
    // own profile row. Supabase Auth owns credentials; the platform owns
    // everything it must not be trusted for, and that record has to exist
    // before any capability can hang off it.
    if (!loaded.profile) {
      await users.createProfile({
        id: verified.userId,
        email: verified.email,
        mobile: verified.mobile,
      });
      loaded = await users.loadPrincipal(verified.userId, input.organizationId);
    }

    // The header claims an organization; membership decides whether that claim
    // holds. Never defaulted silently — acting inside the wrong organization is
    // worse than being told to pick one.
    if (input.organizationId !== null && loaded.isMember !== true) {
      throw new OrganizationForbiddenError('Not a member of that organization');
    }

    return {
      userId: verified.userId,
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
