import { Controller, Get, Header, Headers, Inject, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { RESOLVE_PRINCIPAL } from "@/modules/me/me.tokens.ts";
import { MONITOR_PARTNERS } from "@/modules/administration/administration.tokens.ts";
import type { resolvePrincipal } from "@/application/identity/resolve-principal/resolve-principal.use-case.ts";
import type { monitorPartners } from "@/application/administration/monitor-partners/monitor-partners.use-case.ts";
@Controller("admin/partners")
export class PartnerMonitoringController {
  constructor(
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
    @Inject(MONITOR_PARTNERS)
    private readonly monitor: ReturnType<typeof monitorPartners>,
  ) {}
  @Get("summary")
  @Header("Cache-Control", "no-store")
  async summary(
    @Req() request: FastifyRequest,
    @Headers("authorization") authorization?: string,
    @Headers("x-admin-purpose") purpose?: string,
  ) {
    const principal = await this.resolve({
      authorization,
      organizationId: null,
    });
    return {
      items: await this.monitor(principal, {
        purpose: purpose ?? "",
        requestId: request.id,
      }),
    };
  }
}
