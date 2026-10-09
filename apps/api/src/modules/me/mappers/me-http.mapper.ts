import type { GetMeResult } from '@/application/me/get-me/get-me.types.ts';

export function toMeHttpResponse(result: GetMeResult) {
  const { principal, profile, organizations, agentProfile } = result;
  const displayName = profile?.displayName || principal.displayName;
  return {
    id: principal.userId,
    displayName,
    email: profile?.email ?? null,
    user: {
      id: principal.userId,
      displayName,
      email: profile?.email ?? null,
    },
    organizations: organizations.map((o) => ({
      id: o.organizationId,
      name: o.name,
      role: o.role,
      verified: o.verified,
    })),
    memberships: organizations.map((o) => ({
      organizationId: o.organizationId,
      organizationName: o.name,
      role: o.role,
    })),
    capabilities: principal.capabilities.map((c) => ({
      capability: c.capability,
      organizationId: c.organizationId,
    })),
    agentProfile: agentProfile
      ? {
          id: agentProfile.id,
          displayName: agentProfile.displayName,
          headline: agentProfile.headline,
          photoUrl: agentProfile.photoUrl,
          verificationState: agentProfile.verificationState,
          verified: agentProfile.verificationState === 'VERIFIED',
        }
      : null,
  };
}
