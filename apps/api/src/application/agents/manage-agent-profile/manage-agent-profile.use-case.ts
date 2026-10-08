import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import {
  AgentProfileNotFoundError,
  assertMayRequestVerification,
  normaliseAgentProfile,
  type AgentProfile,
  type AgentProfileInput,
} from '@/domain/agents/agent.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export const getMyAgentProfile =
  (agents: AgentRepository) =>
  async (input: { readonly principal: Principal }): Promise<AgentProfile | null> =>
    agents.findByUser(input.principal.userId);

export const registerAgentProfile =
  (agents: AgentRepository) =>
  async (input: { readonly principal: Principal; readonly profile: AgentProfileInput }): Promise<AgentProfile> =>
    agents.create(input.principal.userId, normaliseAgentProfile(input.profile));

export const updateAgentProfile =
  (agents: AgentRepository) =>
  async (input: { readonly principal: Principal; readonly profile: AgentProfileInput }): Promise<AgentProfile> => {
    const current = await agents.findByUser(input.principal.userId);
    if (!current) throw new AgentProfileNotFoundError('Set up your agent profile first');
    return agents.update(input.principal.userId, normaliseAgentProfile(input.profile));
  };

export const requestAgentVerification =
  (agents: AgentRepository) =>
  async (input: { readonly principal: Principal }): Promise<AgentProfile> => {
    const current = await agents.findByUser(input.principal.userId);
    if (!current) throw new AgentProfileNotFoundError('Set up your agent profile first');
    assertMayRequestVerification(current);
    return agents.requestVerification(input.principal.userId);
  };
