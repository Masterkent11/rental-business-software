import { describe, expect, it } from 'vitest';
import { DiscoveryController } from '@/modules/discovery/controllers/discovery.controller.ts';
import {
  OrganizationForbiddenError,
  UnauthenticatedError,
} from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { Principal } from '@/domain/identity/identity.ts';

const principal: Principal = {
  userId: 'u-1',
  displayName: 'Guest',
  capabilities: [{ capability: 'CUSTOMER', organizationId: null }],
  organizationId: null,
};

function controller(resolve: () => Promise<Principal>, seen: { userId: string | null }[]) {
  const unused = (async () => {
    throw new Error('not exercised');
  }) as never;
  const recommend = (async (input: { userId: string | null }) => {
    seen.push({ userId: input.userId });
    return { scope: 'BROAD', items: [] };
  }) as never;
  return new DiscoveryController(unused, unused, unused, recommend, unused, resolve as never);
}

describe('DiscoveryController recommendations', () => {
  it('personalises for a valid session', async () => {
    const seen: { userId: string | null }[] = [];
    await controller(async () => principal, seen).recommendations({ intent: 'RENT' }, 'Bearer valid');
    expect(seen).toEqual([{ userId: 'u-1' }]);
  });

  it('falls back to anonymous recommendations when the token is invalid or expired', async () => {
    const seen: { userId: string | null }[] = [];
    const response = await controller(async () => {
      throw new UnauthenticatedError('Invalid or expired token');
    }, seen).recommendations({ intent: 'RENT' }, 'Bearer expired');
    expect(seen).toEqual([{ userId: null }]);
    expect(response).toMatchObject({ scope: 'BROAD', items: [] });
  });

  it('does not swallow unexpected identity failures', async () => {
    const seen: { userId: string | null }[] = [];
    await expect(
      controller(async () => {
        throw new OrganizationForbiddenError('nope');
      }, seen).recommendations({ intent: 'RENT' }, 'Bearer valid'),
    ).rejects.toBeInstanceOf(OrganizationForbiddenError);
    expect(seen).toEqual([]);
  });
});
