import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import { isAssignable, type AgentProfile } from '@/domain/agents/agent.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export const searchAssignableAgents =
  (agents: AgentRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly text: string | null;
    readonly area: string | null;
  }): Promise<readonly AgentProfile[]> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const found = await agents.searchPublic({
      ...(input.text ? { text: input.text } : {}),
      ...(input.area ? { area: input.area } : {}),
      limit: 30,
    });
    return found.filter(isAssignable);
  };
