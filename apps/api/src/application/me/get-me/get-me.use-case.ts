import { hasCapability } from '@/domain/identity/identity.ts';
import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';
import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { GetMeInput, GetMeResult } from './get-me.types.ts';

export function getMe(users: UserRepository, agents?: AgentRepository) {
  return async function execute(input: GetMeInput): Promise<GetMeResult> {
    const [profile, organizations, agentProfile] = await Promise.all([
      users.findProfile(input.principal.userId),
      users.organizationsFor(input.principal.userId),
      agents ? agents.findByUser(input.principal.userId) : Promise.resolve(null),
    ]);
    return {
      principal: input.principal,
      profile,
      organizations,
      agentProfile: agentProfile?.verificationState !== 'SUSPENDED' && hasCapability(input.principal, 'AGENT') ? agentProfile : null,
    };
  };
}
