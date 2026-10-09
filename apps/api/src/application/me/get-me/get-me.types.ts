import type { Principal } from '@/domain/identity/identity.ts';
import type { AgentProfile } from '@/domain/agents/agent.ts';
import type {
  OrganizationMembershipView,
  UserProfile,
} from '@/application/ports/repositories/user-repository.port.ts';

export interface GetMeInput {
  readonly principal: Principal;
}

export interface GetMeResult {
  readonly principal: Principal;
  readonly profile: UserProfile | null;
  readonly organizations: readonly OrganizationMembershipView[];
  readonly agentProfile: AgentProfile | null;
}
