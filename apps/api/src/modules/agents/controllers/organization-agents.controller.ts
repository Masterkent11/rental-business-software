import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  END_REPRESENTATION,
  GET_ORGANIZATION_ANALYTICS,
  INVITE_AGENT,
  LIST_ORGANIZATION_REPRESENTATIONS,
  SEARCH_ASSIGNABLE_AGENTS,
  UPDATE_REPRESENTATION_PERMISSIONS,
} from '@/modules/agents/agent.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { searchAssignableAgents } from '@/application/agents/search-agents/search-agents.use-case.ts';
import type {
  endRepresentation,
  inviteAgentToListing,
  listOrganizationRepresentations,
  updateRepresentationPermissions,
} from '@/application/agents/manage-representation/manage-representation.use-case.ts';
import type { getOrganizationAnalytics } from '@/application/agents/partner-analytics/partner-analytics.use-case.ts';
import {
  agentSearchSchema,
  endRepresentationSchema,
  inviteAgentSchema,
  permissionsSchema,
} from '@/modules/agents/dto/agent.dto.ts';
import {
  toAnalyticsHttpResponse,
  toPublicAgentHttpResponse,
  toRepresentationHttpResponse,
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

const definedPermissions = (value: { canEditListing?: boolean | undefined; canManageTour?: boolean | undefined; canViewCommercial?: boolean | undefined }) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as {
    canEditListing?: boolean;
    canManageTour?: boolean;
    canViewCommercial?: boolean;
  };

@Controller('organizations/:organizationId')
export class OrganizationAgentsController {
  constructor(
    @Inject(SEARCH_ASSIGNABLE_AGENTS) private readonly search: ReturnType<typeof searchAssignableAgents>,
    @Inject(INVITE_AGENT) private readonly invite: ReturnType<typeof inviteAgentToListing>,
    @Inject(END_REPRESENTATION) private readonly end: ReturnType<typeof endRepresentation>,
    @Inject(UPDATE_REPRESENTATION_PERMISSIONS) private readonly updatePermissions: ReturnType<typeof updateRepresentationPermissions>,
    @Inject(LIST_ORGANIZATION_REPRESENTATIONS) private readonly listRepresentations: ReturnType<typeof listOrganizationRepresentations>,
    @Inject(GET_ORGANIZATION_ANALYTICS) private readonly analytics: ReturnType<typeof getOrganizationAnalytics>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  private principal(organizationId: string, auth: string | undefined) {
    return this.resolve({ authorization: auth, organizationId: guid(organizationId, 'organization') });
  }

  @Get('agents')
  async agents(@Param('organizationId') organizationId: string, @Query() query: unknown, @Headers('authorization') auth?: string) {
    const input = parse(agentSearchSchema, query);
    const principal = await this.principal(organizationId, auth);
    const rows = await this.search({ principal, organizationId, text: input.q ?? null, area: input.area ?? null });
    return { items: rows.map(toPublicAgentHttpResponse) };
  }

  @Get('representations')
  async representations(@Param('organizationId') organizationId: string, @Headers('authorization') auth?: string) {
    const principal = await this.principal(organizationId, auth);
    const rows = await this.listRepresentations({ principal, organizationId });
    return { items: rows.map(toRepresentationHttpResponse) };
  }

  @Post('listings/:listingId/representation')
  async assign(
    @Param('organizationId') organizationId: string,
    @Param('listingId') listingId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(inviteAgentSchema, body);
    const principal = await this.principal(organizationId, auth);
    return toRepresentationHttpResponse(
      await this.invite({
        principal,
        organizationId,
        listingId: guid(listingId, 'listing'),
        agentId: input.agentId,
        permissions: definedPermissions(input.permissions),
      }),
    );
  }

  @Post('representations/:id/end')
  @HttpCode(200)
  async endRepresentation(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(endRepresentationSchema, body);
    const principal = await this.principal(organizationId, auth);
    return toRepresentationHttpResponse(
      await this.end({ principal, organizationId, representationId: guid(id, 'representation'), reason: input.reason }),
    );
  }

  @Put('representations/:id/permissions')
  async permissions(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(permissionsSchema, body);
    const principal = await this.principal(organizationId, auth);
    return toRepresentationHttpResponse(
      await this.updatePermissions({ principal, organizationId, representationId: guid(id, 'representation'), permissions: input }),
    );
  }

  @Get('analytics')
  async getAnalytics(@Param('organizationId') organizationId: string, @Headers('authorization') auth?: string) {
    const principal = await this.principal(organizationId, auth);
    return toAnalyticsHttpResponse(await this.analytics({ principal, organizationId }));
  }
}
