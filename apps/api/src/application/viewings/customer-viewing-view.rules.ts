import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { CustomerViewingView } from '@/application/viewings/viewing.types.ts';
import type { Viewing } from '@/domain/viewings/viewing.ts';

export async function customerViewingView(viewing: Viewing, agents: AgentRepository): Promise<CustomerViewingView> {
  if (!viewing.agentId) return { viewing, agent: null };
  const profile = await agents.findAssigned(viewing.customerId, viewing.agentId);
  if (!profile) return { viewing, agent: null };
  return {
    viewing,
    agent: {
      agentId: profile.id,
      displayName: profile.displayName,
      headline: profile.headline,
      photoUrl: profile.photoUrl,
      verified: profile.verificationState === 'VERIFIED',
      organizationName: viewing.organizationName,
    },
  };
}
