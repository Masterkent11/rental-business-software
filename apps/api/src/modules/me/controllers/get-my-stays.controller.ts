import { Controller, Get, Headers, Inject } from '@nestjs/common';
import { GET_MY_STAYS, RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { getMyStays } from '@/application/me/get-my-stays/get-my-stays.use-case.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import { toStayHttpResponse } from '@/modules/me/mappers/stay-http.mapper.ts';

@Controller('me')
export class GetMyStaysController {
  constructor(
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
    @Inject(GET_MY_STAYS)
    private readonly staysUseCase: ReturnType<typeof getMyStays>,
  ) {}

  @Get('stays')
  async getMyStays(
    @Headers('authorization') auth?: string,
    @Headers('x-organization-id') orgHeader?: string,
  ) {
    const principal = await this.resolve({
      authorization: auth,
      organizationId: orgHeader?.trim() || null,
    });

    const stays = await this.staysUseCase({ userId: principal.userId });
    return { stays: stays.map(toStayHttpResponse) };
  }
}
