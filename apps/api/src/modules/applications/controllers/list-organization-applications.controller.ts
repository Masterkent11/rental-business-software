import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
} from '@nestjs/common';
import { z } from 'zod';
import { LIST_ORGANIZATION_APPLICATIONS } from '@/modules/applications/application.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { listOrganizationApplications } from '@/application/applications/list-organization-applications/list-organization-applications.use-case.ts';
import { toApplicationHttpResponse } from '@/modules/applications/mappers/applications-http.mapper.ts';

@Controller('organizations/:organizationId/applications')
export class ListOrganizationApplicationsController {
  constructor(
    @Inject(LIST_ORGANIZATION_APPLICATIONS)
    private readonly listOrgApplicationsUseCase: ReturnType<typeof listOrganizationApplications>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get()
  async forOwner(
    @Param('organizationId') organizationId: string,
    @Headers('authorization') auth?: string,
  ) {
    if (!z.guid().safeParse(organizationId).success) {
      throw new BadRequestException('Not an organization id');
    }

    const principal = await this.resolve({ authorization: auth, organizationId });
    const applications = await this.listOrgApplicationsUseCase(principal, organizationId);
    return { applications: applications.map(toApplicationHttpResponse) };
  }
}
