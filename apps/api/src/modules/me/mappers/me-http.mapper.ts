import type { Principal } from '@/domain/identity/identity.ts';

export function toMeHttpResponse(principal: Principal) {
  return {
    user: {
      id: principal.userId,
      displayName: principal.displayName,
    },
    memberships: principal.capabilities
      .filter((c) => c.organizationId !== null)
      .map((c) => ({
        organizationId: c.organizationId as string,
        role: c.capability,
      })),
    capabilities: principal.capabilities.map((c) => ({
      capability: c.capability,
      organizationId: c.organizationId,
    })),
  };
}
