import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { RESOLVE_PRINCIPAL, GET_TENANT_HOME, REQUEST_TENANT_MAINTENANCE } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { getTenantHome } from '@/application/me/get-tenant-home/get-tenant-home.use-case.ts';
import type { requestTenantMaintenance } from '@/application/me/get-tenant-home/request-tenant-maintenance.use-case.ts';
import { tenantMaintenanceSchema } from '../dto/tenant-maintenance.dto.ts';

@Controller('me')
export class TenantHomeController {
  constructor(
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
    @Inject(GET_TENANT_HOME) private readonly home: ReturnType<typeof getTenantHome>,
    @Inject(REQUEST_TENANT_MAINTENANCE) private readonly maintenance: ReturnType<typeof requestTenantMaintenance>,
  ) {}

  @Get('home')
  async context(@Headers('authorization') authorization?: string) {
    const principal = await this.resolve({ authorization, organizationId: null });
    return this.home({ userId: principal.userId });
  }

  @Post('tenancies/:id/maintenance')
  async request(@Param('id') id: string, @Body() body: unknown, @Headers('authorization') authorization?: string) {
    const parsed = tenantMaintenanceSchema.safeParse(body);
    if (!z.guid().safeParse(id).success || !parsed.success) {
      throw new BadRequestException('Enter a valid tenancy and repair request.');
    }
    const principal = await this.resolve({ authorization, organizationId: null });
    return this.maintenance({ principal, tenancyId: id, ...parsed.data });
  }

  @Get('tenancies/:id')
  async details(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    if (!z.guid().safeParse(id).success) throw new BadRequestException('Invalid tenancy identifier.');
    const principal = await this.resolve({ authorization, organizationId: null });
    const result = await this.home({ userId: principal.userId, tenancyId: id });
    return result.tenancies[0];
  }
}
