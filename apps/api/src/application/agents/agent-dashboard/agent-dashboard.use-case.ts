import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { AgentTaskRepository } from '@/application/ports/repositories/agent-task-repository.port.ts';
import type { InquiryRepository } from '@/application/ports/repositories/inquiry-repository.port.ts';
import type { RepresentationRepository } from '@/application/ports/repositories/representation-repository.port.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import {
  AgentProfileNotFoundError,
  responseMetrics,
  type AgentProfile,
  type AgentResponseMetrics,
} from '@/domain/agents/agent.ts';
import { agentWorkload, type AgentWorkload } from '@/domain/agents/agent-dashboard.ts';
import type { Inquiry } from '@/domain/inquiries/inquiry.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export interface AgentDashboard {
  readonly agent: AgentProfile;
  readonly workload: AgentWorkload;
  readonly response: AgentResponseMetrics;
  readonly pendingInvitations: number;
  readonly representedListings: number;
  readonly recentInquiries: readonly Inquiry[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const getAgentDashboard =
  (
    agents: AgentRepository,
    inquiries: InquiryRepository,
    viewings: ViewingRepository,
    tasks: AgentTaskRepository,
    representations: RepresentationRepository,
    clock: Clock,
  ) =>
  async (input: { readonly principal: Principal }): Promise<AgentDashboard> => {
    const agent = await agents.findByUser(input.principal.userId);
    if (!agent) throw new AgentProfileNotFoundError('Set up your agent profile first');
    const now = clock.now();
    const [allInquiries, upcoming, openTasks, reps, samples] = await Promise.all([
      inquiries.listForAgent(input.principal.userId, {}),
      viewings.listForAgent(input.principal.userId, {
        from: new Date(now.getTime() - DAY_MS),
        to: new Date(now.getTime() + 2 * DAY_MS),
      }),
      tasks.list(input.principal.userId, false),
      representations.listForAgent(input.principal.userId),
      agents.responseSamples(agent.id, new Date(now.getTime() - 90 * DAY_MS)),
    ]);
    return {
      agent,
      workload: agentWorkload({ now, inquiries: allInquiries, viewings: upcoming, tasks: openTasks }),
      response: responseMetrics(samples),
      pendingInvitations: reps.filter((rep) => rep.state === 'PENDING').length,
      representedListings: reps.filter((rep) => rep.state === 'ACTIVE').length,
      recentInquiries: allInquiries.slice(0, 6),
    };
  };
