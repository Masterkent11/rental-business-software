import { Module } from '@nestjs/common';
import { PublicAgentsController } from './controllers/public-agents.controller.ts';
import { AgentWorkspaceController } from './controllers/agent-workspace.controller.ts';
import { OrganizationAgentsController } from './controllers/organization-agents.controller.ts';
import { AdminAgentsController } from './controllers/admin-agents.controller.ts';
import {
  CREATE_AGENT_TASK,
  DECIDE_AGENT_VERIFICATION,
  END_REPRESENTATION,
  GET_AGENT_ANALYTICS,
  GET_AGENT_DASHBOARD,
  GET_MY_AGENT_PROFILE,
  GET_ORGANIZATION_ANALYTICS,
  INVITE_AGENT,
  LIST_AGENT_CLIENTS,
  LIST_AGENT_REPRESENTATIONS,
  LIST_AGENT_TASKS,
  LIST_ORGANIZATION_REPRESENTATIONS,
  LIST_PENDING_AGENT_VERIFICATIONS,
  REGISTER_AGENT_PROFILE,
  REMOVE_AGENT_TASK,
  REQUEST_AGENT_VERIFICATION,
  RESPOND_TO_REPRESENTATION,
  SEARCH_ASSIGNABLE_AGENTS,
  SET_AGENT_TASK_DONE,
  UPDATE_AGENT_PROFILE,
  UPDATE_REPRESENTATION_PERMISSIONS,
  VIEW_PUBLIC_AGENT,
} from './agent.tokens.ts';
import {
  AGENT_REPOSITORY,
  AGENT_TASK_REPOSITORY,
  ANALYTICS_REPOSITORY,
  CLOCK,
  INQUIRY_REPOSITORY,
  NOTIFICATION_REPOSITORY,
  REPRESENTATION_REPOSITORY,
  SHARED_LISTING_REPOSITORY,
  VIEWING_REPOSITORY,
} from '@/modules/shared/shared.tokens.ts';
import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { AgentTaskRepository } from '@/application/ports/repositories/agent-task-repository.port.ts';
import type { AnalyticsRepository } from '@/application/ports/repositories/analytics-repository.port.ts';
import type { InquiryRepository } from '@/application/ports/repositories/inquiry-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { RepresentationRepository } from '@/application/ports/repositories/representation-repository.port.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import {
  getMyAgentProfile,
  registerAgentProfile,
  requestAgentVerification,
  updateAgentProfile,
} from '@/application/agents/manage-agent-profile/manage-agent-profile.use-case.ts';
import {
  decideAgentVerification,
  listPendingAgentVerifications,
} from '@/application/agents/review-agent-verification/review-agent-verification.use-case.ts';
import { viewPublicAgent } from '@/application/agents/view-public-agent/view-public-agent.use-case.ts';
import { searchAssignableAgents } from '@/application/agents/search-agents/search-agents.use-case.ts';
import {
  endRepresentation,
  inviteAgentToListing,
  listAgentRepresentations,
  listOrganizationRepresentations,
  respondToRepresentation,
  updateRepresentationPermissions,
} from '@/application/agents/manage-representation/manage-representation.use-case.ts';
import { getAgentDashboard } from '@/application/agents/agent-dashboard/agent-dashboard.use-case.ts';
import {
  createAgentTask,
  listAgentTasks,
  removeAgentTask,
  setAgentTaskDone,
} from '@/application/agents/manage-agent-tasks/manage-agent-tasks.use-case.ts';
import { listAgentClients } from '@/application/agents/list-agent-clients/list-agent-clients.use-case.ts';
import {
  getAgentAnalytics,
  getOrganizationAnalytics,
} from '@/application/agents/partner-analytics/partner-analytics.use-case.ts';

@Module({
  controllers: [PublicAgentsController, AgentWorkspaceController, OrganizationAgentsController, AdminAgentsController],
  providers: [
    { provide: GET_MY_AGENT_PROFILE, inject: [AGENT_REPOSITORY], useFactory: (a: AgentRepository) => getMyAgentProfile(a) },
    { provide: REGISTER_AGENT_PROFILE, inject: [AGENT_REPOSITORY], useFactory: (a: AgentRepository) => registerAgentProfile(a) },
    { provide: UPDATE_AGENT_PROFILE, inject: [AGENT_REPOSITORY], useFactory: (a: AgentRepository) => updateAgentProfile(a) },
    { provide: REQUEST_AGENT_VERIFICATION, inject: [AGENT_REPOSITORY], useFactory: (a: AgentRepository) => requestAgentVerification(a) },
    {
      provide: LIST_PENDING_AGENT_VERIFICATIONS,
      inject: [AGENT_REPOSITORY],
      useFactory: (a: AgentRepository) => listPendingAgentVerifications(a),
    },
    {
      provide: DECIDE_AGENT_VERIFICATION,
      inject: [AGENT_REPOSITORY, NOTIFICATION_REPOSITORY],
      useFactory: (a: AgentRepository, n: NotificationRepository) => decideAgentVerification(a, n),
    },
    {
      provide: VIEW_PUBLIC_AGENT,
      inject: [AGENT_REPOSITORY, SHARED_LISTING_REPOSITORY, CLOCK],
      useFactory: (a: AgentRepository, l: ListingRepository, c: Clock) => viewPublicAgent(a, l, c),
    },
    { provide: SEARCH_ASSIGNABLE_AGENTS, inject: [AGENT_REPOSITORY], useFactory: (a: AgentRepository) => searchAssignableAgents(a) },
    {
      provide: INVITE_AGENT,
      inject: [REPRESENTATION_REPOSITORY, AGENT_REPOSITORY, SHARED_LISTING_REPOSITORY, NOTIFICATION_REPOSITORY],
      useFactory: (r: RepresentationRepository, a: AgentRepository, l: ListingRepository, n: NotificationRepository) =>
        inviteAgentToListing(r, a, l, n),
    },
    {
      provide: RESPOND_TO_REPRESENTATION,
      inject: [REPRESENTATION_REPOSITORY, NOTIFICATION_REPOSITORY],
      useFactory: (r: RepresentationRepository, n: NotificationRepository) => respondToRepresentation(r, n),
    },
    {
      provide: END_REPRESENTATION,
      inject: [REPRESENTATION_REPOSITORY, AGENT_REPOSITORY, NOTIFICATION_REPOSITORY],
      useFactory: (r: RepresentationRepository, a: AgentRepository, n: NotificationRepository) => endRepresentation(r, a, n),
    },
    {
      provide: UPDATE_REPRESENTATION_PERMISSIONS,
      inject: [REPRESENTATION_REPOSITORY],
      useFactory: (r: RepresentationRepository) => updateRepresentationPermissions(r),
    },
    {
      provide: LIST_ORGANIZATION_REPRESENTATIONS,
      inject: [REPRESENTATION_REPOSITORY],
      useFactory: (r: RepresentationRepository) => listOrganizationRepresentations(r),
    },
    {
      provide: LIST_AGENT_REPRESENTATIONS,
      inject: [REPRESENTATION_REPOSITORY],
      useFactory: (r: RepresentationRepository) => listAgentRepresentations(r),
    },
    {
      provide: GET_AGENT_DASHBOARD,
      inject: [AGENT_REPOSITORY, INQUIRY_REPOSITORY, VIEWING_REPOSITORY, AGENT_TASK_REPOSITORY, REPRESENTATION_REPOSITORY, CLOCK],
      useFactory: (
        a: AgentRepository,
        i: InquiryRepository,
        v: ViewingRepository,
        t: AgentTaskRepository,
        r: RepresentationRepository,
        c: Clock,
      ) => getAgentDashboard(a, i, v, t, r, c),
    },
    { provide: LIST_AGENT_TASKS, inject: [AGENT_TASK_REPOSITORY], useFactory: (t: AgentTaskRepository) => listAgentTasks(t) },
    {
      provide: CREATE_AGENT_TASK,
      inject: [AGENT_TASK_REPOSITORY, INQUIRY_REPOSITORY],
      useFactory: (t: AgentTaskRepository, i: InquiryRepository) => createAgentTask(t, i),
    },
    { provide: SET_AGENT_TASK_DONE, inject: [AGENT_TASK_REPOSITORY], useFactory: (t: AgentTaskRepository) => setAgentTaskDone(t) },
    { provide: REMOVE_AGENT_TASK, inject: [AGENT_TASK_REPOSITORY], useFactory: (t: AgentTaskRepository) => removeAgentTask(t) },
    { provide: LIST_AGENT_CLIENTS, inject: [INQUIRY_REPOSITORY], useFactory: (i: InquiryRepository) => listAgentClients(i) },
    {
      provide: GET_ORGANIZATION_ANALYTICS,
      inject: [ANALYTICS_REPOSITORY, CLOCK],
      useFactory: (a: AnalyticsRepository, c: Clock) => getOrganizationAnalytics(a, c),
    },
    {
      provide: GET_AGENT_ANALYTICS,
      inject: [ANALYTICS_REPOSITORY, CLOCK],
      useFactory: (a: AnalyticsRepository, c: Clock) => getAgentAnalytics(a, c),
    },
  ],
})
export class AgentsModule {}
