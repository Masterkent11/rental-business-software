import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  CREATE_AGENT_TASK,
  END_REPRESENTATION,
  GET_AGENT_ANALYTICS,
  GET_AGENT_DASHBOARD,
  GET_MY_AGENT_PROFILE,
  LIST_AGENT_CLIENTS,
  LIST_AGENT_REPRESENTATIONS,
  LIST_AGENT_TASKS,
  REGISTER_AGENT_PROFILE,
  REMOVE_AGENT_TASK,
  REQUEST_AGENT_VERIFICATION,
  REQUEST_REPRESENTATION,
  RESPOND_TO_REPRESENTATION,
  SET_AGENT_TASK_DONE,
  UPDATE_AGENT_PROFILE,
} from '@/modules/agents/agent.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type {
  getMyAgentProfile,
  registerAgentProfile,
  requestAgentVerification,
  updateAgentProfile,
} from '@/application/agents/manage-agent-profile/manage-agent-profile.use-case.ts';
import type {
  endRepresentation,
  listAgentRepresentations,
  requestRepresentation,
  respondToRepresentation,
} from '@/application/agents/manage-representation/manage-representation.use-case.ts';
import type { getAgentDashboard } from '@/application/agents/agent-dashboard/agent-dashboard.use-case.ts';
import type {
  createAgentTask,
  listAgentTasks,
  removeAgentTask,
  setAgentTaskDone,
} from '@/application/agents/manage-agent-tasks/manage-agent-tasks.use-case.ts';
import type { listAgentClients } from '@/application/agents/list-agent-clients/list-agent-clients.use-case.ts';
import type { getAgentAnalytics } from '@/application/agents/partner-analytics/partner-analytics.use-case.ts';
import {
  agentProfileSchema,
  createTaskSchema,
  endRepresentationSchema,
  respondSchema,
  taskDoneSchema,
  taskListQuerySchema,
} from '@/modules/agents/dto/agent.dto.ts';
import {
  toAgentDashboardHttpResponse,
  toAnalyticsHttpResponse,
  toClientHttpResponse,
  toOwnAgentHttpResponse,
  toRepresentationHttpResponse,
  toTaskHttpResponse,
} from '@/modules/agents/mappers/agent-http.mapper.ts';

const parse = <T>(schema: z.ZodType<T>, raw: unknown): T => {
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    throw new BadRequestException(`${where}${issue?.message ?? 'Invalid request'}`);
  }
  return parsed.data;
};

const guid = (value: string, what: string) => {
  if (!z.guid().safeParse(value).success) throw new BadRequestException(`Not a valid ${what} id`);
  return value;
};

@Controller('agent')
export class AgentWorkspaceController {
  constructor(
    @Inject(GET_MY_AGENT_PROFILE) private readonly getProfile: ReturnType<typeof getMyAgentProfile>,
    @Inject(REGISTER_AGENT_PROFILE) private readonly registerProfile: ReturnType<typeof registerAgentProfile>,
    @Inject(UPDATE_AGENT_PROFILE) private readonly updateProfile: ReturnType<typeof updateAgentProfile>,
    @Inject(REQUEST_AGENT_VERIFICATION) private readonly requestVerification: ReturnType<typeof requestAgentVerification>,
    @Inject(LIST_AGENT_REPRESENTATIONS) private readonly listRepresentations: ReturnType<typeof listAgentRepresentations>,
    @Inject(RESPOND_TO_REPRESENTATION) private readonly respond: ReturnType<typeof respondToRepresentation>,
    @Inject(REQUEST_REPRESENTATION) private readonly askToRepresent: ReturnType<typeof requestRepresentation>,
    @Inject(END_REPRESENTATION) private readonly end: ReturnType<typeof endRepresentation>,
    @Inject(GET_AGENT_DASHBOARD) private readonly dashboard: ReturnType<typeof getAgentDashboard>,
    @Inject(LIST_AGENT_TASKS) private readonly listTasks: ReturnType<typeof listAgentTasks>,
    @Inject(CREATE_AGENT_TASK) private readonly createTask: ReturnType<typeof createAgentTask>,
    @Inject(SET_AGENT_TASK_DONE) private readonly setTaskDone: ReturnType<typeof setAgentTaskDone>,
    @Inject(REMOVE_AGENT_TASK) private readonly removeTask: ReturnType<typeof removeAgentTask>,
    @Inject(LIST_AGENT_CLIENTS) private readonly listClients: ReturnType<typeof listAgentClients>,
    @Inject(GET_AGENT_ANALYTICS) private readonly analytics: ReturnType<typeof getAgentAnalytics>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  private principal(auth: string | undefined) {
    return this.resolve({ authorization: auth, organizationId: null });
  }

  @Get('profile')
  async profile(@Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    const profile = await this.getProfile({ principal });
    if (!profile) throw new NotFoundException('You have not set up an agent profile yet');
    return toOwnAgentHttpResponse(profile);
  }

  @Post('profile')
  async register(@Body() body: unknown, @Headers('authorization') auth?: string) {
    const input = parse(agentProfileSchema, body);
    const principal = await this.principal(auth);
    return toOwnAgentHttpResponse(await this.registerProfile({ principal, profile: input }));
  }

  @Put('profile')
  async update(@Body() body: unknown, @Headers('authorization') auth?: string) {
    const input = parse(agentProfileSchema, body);
    const principal = await this.principal(auth);
    return toOwnAgentHttpResponse(await this.updateProfile({ principal, profile: input }));
  }

  @Post('profile/verification')
  @HttpCode(200)
  async verification(@Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    return toOwnAgentHttpResponse(await this.requestVerification({ principal }));
  }

  @Get('dashboard')
  async getDashboard(@Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    return toAgentDashboardHttpResponse(await this.dashboard({ principal }));
  }

  @Get('representations')
  async representations(@Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    const rows = await this.listRepresentations({ principal });
    return { items: rows.map(toRepresentationHttpResponse) };
  }

  @Post('representations/:id/respond')
  @HttpCode(200)
  async respondTo(@Param('id') id: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    const input = parse(respondSchema, body);
    const principal = await this.principal(auth);
    return toRepresentationHttpResponse(
      await this.respond({ principal, representationId: guid(id, 'invitation'), accept: input.accept }),
    );
  }

  @Post('listings/:listingId/representation-requests')
  async requestToRepresent(@Param('listingId') listingId: string, @Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    return toRepresentationHttpResponse(
      await this.askToRepresent({ principal, listingId: guid(listingId, 'listing') }),
    );
  }

  @Post('representations/:id/end')
  @HttpCode(200)
  async endRepresentation(@Param('id') id: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    const input = parse(endRepresentationSchema, body);
    const principal = await this.principal(auth);
    return toRepresentationHttpResponse(
      await this.end({ principal, organizationId: null, representationId: guid(id, 'representation'), reason: input.reason }),
    );
  }

  @Get('clients')
  async clients(@Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    const rows = await this.listClients({ principal });
    return { items: rows.map(toClientHttpResponse) };
  }

  @Get('tasks')
  async tasks(@Query() query: unknown, @Headers('authorization') auth?: string) {
    const input = parse(taskListQuerySchema, query);
    const principal = await this.principal(auth);
    const rows = await this.listTasks({ principal, includeDone: input.includeDone });
    return { items: rows.map(toTaskHttpResponse) };
  }

  @Post('tasks')
  async addTask(@Body() body: unknown, @Headers('authorization') auth?: string) {
    const input = parse(createTaskSchema, body);
    const principal = await this.principal(auth);
    const task = await this.createTask({
      principal,
      title: input.title,
      dueAt: new Date(input.dueAt),
      inquiryId: input.inquiryId,
    });
    return toTaskHttpResponse(task);
  }

  @Patch('tasks/:id')
  async markTask(@Param('id') id: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    const input = parse(taskDoneSchema, body);
    const principal = await this.principal(auth);
    return toTaskHttpResponse(await this.setTaskDone({ principal, taskId: guid(id, 'task'), done: input.done }));
  }

  @Delete('tasks/:id')
  async deleteTask(@Param('id') id: string, @Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    await this.removeTask({ principal, taskId: guid(id, 'task') });
    return { removed: true };
  }

  @Get('analytics')
  async getAnalytics(@Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    return toAnalyticsHttpResponse(await this.analytics({ principal }));
  }
}
