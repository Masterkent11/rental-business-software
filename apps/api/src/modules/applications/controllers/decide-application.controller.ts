import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { DECIDE_APPLICATION } from '@/modules/applications/application.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { decideApplication } from '@/application/applications/decide-application/decide-application.use-case.ts';
import { decideApplicationSchema } from '@/modules/applications/dto/decide-application.dto.ts';

@Controller('organizations/:organizationId/applications')
export class DecideApplicationController {
  constructor(
    @Inject(DECIDE_APPLICATION)
    private readonly decideUseCase: ReturnType<typeof decideApplication>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post(':id/decision')
  async decide(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    if (
      !z.guid().safeParse(organizationId).success ||
      !z.guid().safeParse(id).success
    ) {
      throw new BadRequestException('Not an id');
    }

    const parsed = decideApplicationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    const principal = await this.resolve({ authorization: auth, organizationId });
    const application = await this.decideUseCase({
      principal,
      organizationId,
      applicationId: id,
      next: parsed.data.decision,
      ...(parsed.data.reason !== undefined ? { reason: parsed.data.reason } : {}),
    });

    return {
      id: application.id,
      state: application.state,
      decisionReason: application.decisionReason,
    };
  }
}
