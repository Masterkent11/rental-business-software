import {
  Controller,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { WITHDRAW_APPLICATION } from '@/modules/applications/application.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { withdrawApplication } from '@/application/applications/withdraw-application/withdraw-application.use-case.ts';

@Controller('applications')
export class WithdrawApplicationController {
  constructor(
    @Inject(WITHDRAW_APPLICATION)
    private readonly withdrawUseCase: ReturnType<typeof withdrawApplication>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post(':id/withdraw')
  async withdraw(@Param('id') id: string, @Headers('authorization') auth?: string) {
    if (!z.guid().safeParse(id).success) {
      throw new NotFoundException('No such application');
    }

    const principal = await this.resolve({ authorization: auth, organizationId: null });
    const application = await this.withdrawUseCase(principal.userId, id);
    return { id: application.id, state: application.state };
  }
}
