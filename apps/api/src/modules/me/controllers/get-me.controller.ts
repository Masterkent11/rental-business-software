import { Controller, Get, Headers, Inject } from '@nestjs/common';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import { toMeHttpResponse } from '@/modules/me/mappers/me-http.mapper.ts';

@Controller('me')
export class GetMeController {
  constructor(
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get()
  async getMe(
    @Headers('authorization') auth?: string,
    @Headers('x-organization-id') orgHeader?: string,
  ) {
    const principal = await this.resolve({
      authorization: auth,
      organizationId: orgHeader?.trim() || null,
    });

    return toMeHttpResponse(principal);
  }
}
