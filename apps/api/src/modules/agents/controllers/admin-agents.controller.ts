import type { FastifyRequest } from 'fastify';
import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Inject, Param, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import {
  DECIDE_AGENT_VERIFICATION,
  LIST_PENDING_AGENT_VERIFICATIONS,
} from '@/modules/agents/agent.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type {
  decideAgentVerification,
  listPendingAgentVerifications,
} from '@/application/agents/review-agent-verification/review-agent-verification.use-case.ts';
import { verificationDecisionSchema } from '@/modules/agents/dto/agent.dto.ts';
import { toOwnAgentHttpResponse } from '@/modules/agents/mappers/agent-http.mapper.ts';

@Controller('admin/agents')
export class AdminAgentsController {
  constructor(
    @Inject(LIST_PENDING_AGENT_VERIFICATIONS) private readonly pending: ReturnType<typeof listPendingAgentVerifications>,
    @Inject(DECIDE_AGENT_VERIFICATION) private readonly decide: ReturnType<typeof decideAgentVerification>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get('pending')
  async list(@Req() request: FastifyRequest, @Headers('authorization') auth?: string) {
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    const rows = await this.pending({ principal, audit:{purpose:'Agent verification review',requestId:request.id} });
    return { items: rows.map(toOwnAgentHttpResponse) };
  }

  @Post(':id/verification')
  @HttpCode(200)
  async verification(@Req() request: FastifyRequest, @Param('id') id: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    if (!z.guid().safeParse(id).success) throw new BadRequestException('Not a valid agent id');
    const parsed = verificationDecisionSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid request');
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    return toOwnAgentHttpResponse(
      await this.decide({ principal, audit:{purpose:'Agent verification decision',requestId:request.id}, agentId: id, decision: parsed.data.decision, note: parsed.data.note }),
    );
  }
}
