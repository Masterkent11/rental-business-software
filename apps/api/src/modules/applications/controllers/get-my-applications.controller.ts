import { Controller, Get, Headers, Inject } from '@nestjs/common';
import { GET_MY_APPLICATIONS } from '@/modules/applications/application.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { getMyApplications } from '@/application/applications/get-my-applications/get-my-applications.use-case.ts';
import { toApplicationHttpResponse } from '@/modules/applications/mappers/applications-http.mapper.ts';

@Controller('me/applications')
export class GetMyApplicationsController {
  constructor(
    @Inject(GET_MY_APPLICATIONS)
    private readonly getMyApplicationsUseCase: ReturnType<typeof getMyApplications>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get()
  async mine(@Headers('authorization') auth?: string) {
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    const applications = await this.getMyApplicationsUseCase(principal.userId);
    return { applications: applications.map(toApplicationHttpResponse) };
  }
}
