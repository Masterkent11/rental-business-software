import {
  Controller,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { RESERVE_APPLICATION } from '@/modules/applications/application.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { reserveApplication } from '@/application/applications/reserve-application/reserve-application.use-case.ts';

@Controller('applications')
export class ReserveApplicationController {
  constructor(
    @Inject(RESERVE_APPLICATION)
    private readonly reserveUseCase: ReturnType<typeof reserveApplication>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post(':id/reservation')
  async reserve(@Param('id') id: string, @Headers('authorization') auth?: string) {
    if (!z.guid().safeParse(id).success) {
      throw new NotFoundException('No such application');
    }

    const principal = await this.resolve({ authorization: auth, organizationId: null });
    return this.reserveUseCase({
      applicantId: principal.userId,
      applicationId: id,
      holdMinutes: 60,
    });
  }
}
