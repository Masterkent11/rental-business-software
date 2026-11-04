import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import {
  AgentProfileNotFoundError,
  InvalidVerificationRequestError,
  nextVerificationState,
  type AgentProfile,
  type VerificationDecision,
} from '@/domain/agents/agent.ts';
import { type Principal } from '@/domain/identity/identity.ts';
import type { authorizeAdministration } from '@/application/administration/authorize-administration/authorize-administration.use-case.ts';
import type { AdministrativeAudit } from '@/domain/administration/administration.ts';

export const listPendingAgentVerifications =
  (agents: AgentRepository, authorize: ReturnType<typeof authorizeAdministration>) =>
  async (input: { readonly principal: Principal; readonly audit: AdministrativeAudit }): Promise<readonly AgentProfile[]> => {
    const context = await authorize(input.principal,'AGENT_REVIEW',input.audit);
    return agents.pendingVerification(input.principal.userId,context);
  };

export const decideAgentVerification =
  (agents: AgentRepository, notifications: NotificationRepository, authorize: ReturnType<typeof authorizeAdministration>) =>
  async (input: {
    readonly principal: Principal;
    readonly agentId: string;
    readonly audit: AdministrativeAudit;
    readonly decision: VerificationDecision;
    readonly note: string | null;
  }): Promise<AgentProfile> => {
    const context = await authorize(input.principal,'AGENT_REVIEW',input.audit,input.agentId);
    const current = await agents.findForAdmin(input.principal.userId, input.agentId,context);
    if (!current) throw new AgentProfileNotFoundError('Agent not found');
    const next = nextVerificationState(current.verificationState, input.decision);
    const note = input.note?.trim().slice(0, 500) || null;
    const updated = await agents.decideVerification({
      adminUserId: input.principal.userId,
      context,
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
