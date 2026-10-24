import { BadRequestException, Body, Controller, Headers, Inject, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CONFIRM_TENANCY } from '../application.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { confirmTenancy } from '@/application/applications/confirm-tenancy/confirm-tenancy.use-case.ts';

const confirmationSchema = z.object({ requirementsReviewed: z.literal(true) }).strict();

@Controller('organizations/:organizationId/applications')
export class ConfirmTenancyController {
  constructor(
    @Inject(CONFIRM_TENANCY) private readonly confirm: ReturnType<typeof confirmTenancy>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post(':id/tenancy')
  async activate(@Param('organizationId') organizationId: string, @Param('id') applicationId: string,
    @Body() body: unknown, @Headers('authorization') authorization?: string) {
    const parsed = confirmationSchema.safeParse(body);
    if (!z.guid().safeParse(organizationId).success || !z.guid().safeParse(applicationId).success || !parsed.success) {
      throw new BadRequestException('Review the move-in requirements before confirming this tenancy.');
    }
    const principal = await this.resolve({ authorization, organizationId });
    const result = await this.confirm({ principal, organizationId, applicationId, ...parsed.data });
    return { ...result, confirmedAt: result.confirmedAt.toISOString() };
  }
}
