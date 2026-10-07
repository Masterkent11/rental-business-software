import { describe, expect, it } from 'vitest';
import {
  OrganizationForbiddenError,
  UnauthenticatedError,
  resolvePrincipal,
} from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { IdentityProvider } from '@/application/ports/providers/identity-provider.port.ts';
import type {
  UserProfile,
  UserRepository,
} from '@/application/ports/repositories/user-repository.port.ts';
import type { HeldCapability } from '@/domain/identity/identity.ts';

const USER = 'aaaaaaaa-0000-0000-0000-000000000001';
const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

const identityFor = (userId: string | null): IdentityProvider => ({
  verify: async () =>
    userId === null
      ? null
      : { userId, email: 'ana@example.test', mobile: null },
});

function usersWith(options: {
  profile?: UserProfile | null;
  capabilities?: HeldCapability[];
  memberships?: string[];
  onCreate?: () => void;
}): UserRepository {
  const profile =
    options.profile === undefined
      ? { id: USER, displayName: 'Ana', email: null, mobile: null }
      : options.profile;

  return {
    loadPrincipal: async (_userId, organizationId) => ({
      profile,
      capabilities: options.capabilities ?? [],
      isMember:
        organizationId === null
          ? null
          : (options.memberships ?? []).includes(organizationId),
    }),
    findProfile: async () => profile,
    createProfile: async ({ id }) => {
      options.onCreate?.();
      return { id, displayName: '', email: null, mobile: null };
    },
    updateProfile: async () => profile,
    organizationsFor: async () => [],
    capabilitiesFor: async () => options.capabilities ?? [],
    isMemberOf: async (_userId, organizationId) =>
      (options.memberships ?? []).includes(organizationId),
    staysFor: async () => [],
    savedListingIds: async () => [],
    saveListing: async () => {},
    unsaveListing: async () => {},
  };
}

describe('resolvePrincipal', () => {
  it('takes capabilities from the database, not from the token', async () => {
    const resolve = resolvePrincipal(
      identityFor(USER),
      usersWith({
        capabilities: [{ capability: 'CUSTOMER', organizationId: null }],
      }),
    );

    const principal = await resolve({
      authorization: 'Bearer token-claiming-to-be-staff',
      organizationId: null,
    });

    expect(principal.capabilities).toEqual([
      { capability: 'CUSTOMER', organizationId: null },
    ]);
  });

  it('reflects a revocation immediately, without waiting for expiry', async () => {
    const resolve = resolvePrincipal(
      identityFor(USER),
      usersWith({ capabilities: [], memberships: [] }),
    );

    const principal = await resolve({
      authorization: 'Bearer still-valid-token',
      organizationId: null,
    });

    expect(principal.capabilities).toEqual([]);
  });

  it('refuses a request with no token', async () => {
    const resolve = resolvePrincipal(identityFor(USER), usersWith({}));
    await expect(
      resolve({ authorization: undefined, organizationId: null }),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('refuses a token the provider will not verify', async () => {
    const resolve = resolvePrincipal(identityFor(null), usersWith({}));
    await expect(
      resolve({ authorization: 'Bearer forged', organizationId: null }),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('refuses an Authorization header that is not a bearer token', async () => {
    const resolve = resolvePrincipal(identityFor(USER), usersWith({}));
    await expect(
      resolve({ authorization: 'Basic dXNlcjpwYXNz', organizationId: null }),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('refuses an organization the user is not a member of', async () => {
    const resolve = resolvePrincipal(
      identityFor(USER),
      usersWith({ memberships: [ORG_A] }),
    );

    await expect(
      resolve({ authorization: 'Bearer t', organizationId: ORG_B }),
    ).rejects.toBeInstanceOf(OrganizationForbiddenError);
  });

  it('accepts an organization the user is a member of', async () => {
    const resolve = resolvePrincipal(
      identityFor(USER),
      usersWith({ memberships: [ORG_A] }),
    );

    const principal = await resolve({
      authorization: 'Bearer t',
      organizationId: ORG_A,
    });

    expect(principal.organizationId).toBe(ORG_A);
  });

  it('never defaults an organization when the header is absent', async () => {
    const resolve = resolvePrincipal(
      identityFor(USER),
      usersWith({ memberships: [ORG_A, ORG_B] }),
    );

    const principal = await resolve({
      authorization: 'Bearer t',
      organizationId: null,
    });

    expect(principal.organizationId).toBeNull();
  });

  it('creates the platform profile on the first authenticated request', async () => {
    let created = false;
    const resolve = resolvePrincipal(
      identityFor(USER),
      usersWith({ profile: null, onCreate: () => (created = true) }),
    );

    await resolve({ authorization: 'Bearer t', organizationId: null });
    expect(created).toBe(true);
  });
});
