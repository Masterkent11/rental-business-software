import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common';
import { z } from 'zod';
import { VIEW_PUBLIC_AGENT } from '@/modules/agents/agent.tokens.ts';
import type { viewPublicAgent } from '@/application/agents/view-public-agent/view-public-agent.use-case.ts';
import { toPublicAgentViewHttpResponse } from '@/modules/agents/mappers/agent-http.mapper.ts';

@Controller('agents')
export class PublicAgentsController {
  constructor(
    @Inject(VIEW_PUBLIC_AGENT)
    private readonly viewUseCase: ReturnType<typeof viewPublicAgent>,
  ) {}

  @Get(':id')
  async view(@Param('id') id: string) {
    if (!z.guid().safeParse(id).success) throw new NotFoundException('Agent not found');
    return toPublicAgentViewHttpResponse(await this.viewUseCase({ agentId: id }));
  }
}
