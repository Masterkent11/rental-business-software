import {
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { z } from 'zod';
import { GET_MY_APPLICATION } from '@/modules/applications/application.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { getMyApplication } from '@/application/applications/get-my-application/get-my-application.use-case.ts';
import { toApplicationHttpResponse } from '@/modules/applications/mappers/applications-http.mapper.ts';

@Controller('me/applications')
export class GetMyApplicationController {
  constructor(
    @Inject(GET_MY_APPLICATION)
    private readonly getMyApplicationUseCase: ReturnType<typeof getMyApplication>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get(':id')
  async mineById(@Param('id') id: string, @Headers('authorization') auth?: string) {
    if (!z.guid().safeParse(id).success) {
      throw new NotFoundException('No such application');
    }

    const principal = await this.resolve({ authorization: auth, organizationId: null });
    const result = await this.getMyApplicationUseCase(principal.userId, id);
    if (!result) throw new NotFoundException('No such application');

    return { ...toApplicationHttpResponse(result.application), documents: result.documents };
  }
}
