import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import {
  AgentProfileNotFoundError,
  InvalidVerificationRequestError,
  nextVerificationState,
  type AgentProfile,
  type VerificationDecision,
} from '@/domain/agents/agent.ts';
import { hasCapability, type Principal } from '@/domain/identity/identity.ts';
import { OrganizationForbiddenError } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';

const assertPlatformAdmin = (principal: Principal) => {
  if (!hasCapability(principal, 'PLATFORM_ADMIN')) {
    throw new OrganizationForbiddenError('Only the platform team can review agent verification');
  }
};

export const listPendingAgentVerifications =
  (agents: AgentRepository) =>
  async (input: { readonly principal: Principal }): Promise<readonly AgentProfile[]> => {
    assertPlatformAdmin(input.principal);
    return agents.pendingVerification(input.principal.userId);
  };

export const decideAgentVerification =
  (agents: AgentRepository, notifications: NotificationRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly agentId: string;
    readonly decision: VerificationDecision;
    readonly note: string | null;
  }): Promise<AgentProfile> => {
    assertPlatformAdmin(input.principal);
    const current = await agents.findForAdmin(input.principal.userId, input.agentId);
    if (!current) throw new AgentProfileNotFoundError('Agent not found');
    const next = nextVerificationState(current.verificationState, input.decision);
    const note = input.note?.trim().slice(0, 500) || null;
    const updated = await agents.decideVerification({
      adminUserId: input.principal.userId,
      agentId: input.agentId,
      current: current.verificationState,
      next,
      note,
    });
    if (!updated) throw new InvalidVerificationRequestError('The profile changed while you were reviewing it. Reload and try again.');
    await notifications.publish([
      {
        audience: { userId: updated.userId },
        kind: 'REPRESENTATION_UPDATED',
        title:
          next === 'VERIFIED'
            ? 'Your agent profile is verified'
            : next === 'REJECTED'
              ? 'Your verification request needs changes'
              : 'Your agent profile was suspended',
        body: note ?? '',
        link: '/agent/profile',
      },
    ]);
    return updated;
  };
