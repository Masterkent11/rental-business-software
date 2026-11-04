import { Global, Module } from "@nestjs/common";
import {
  ADMINISTRATION_REPOSITORY,
  AUTHORIZE_ADMINISTRATION,
  MONITOR_PARTNERS,
} from "@/modules/administration/administration.tokens.ts";
import { PartnerMonitoringController } from "@/modules/administration/controllers/partner-monitoring.controller.ts";
import { postgresAdministrationRepository } from "@/infrastructure/postgres/repositories/postgres-administration.repository.ts";
import { authorizeAdministration } from "@/application/administration/authorize-administration/authorize-administration.use-case.ts";
import { monitorPartners } from "@/application/administration/monitor-partners/monitor-partners.use-case.ts";
import type { AdministrationRepository } from "@/application/ports/repositories/administration-repository.port.ts";
@Global()
@Module({
  controllers: [PartnerMonitoringController],
  providers: [
    {
      provide: ADMINISTRATION_REPOSITORY,
      useFactory: postgresAdministrationRepository,
    },
    {
      provide: AUTHORIZE_ADMINISTRATION,
      inject: [ADMINISTRATION_REPOSITORY],
      useFactory: (r: AdministrationRepository) => authorizeAdministration(r),
    },
    {
      provide: MONITOR_PARTNERS,
      inject: [ADMINISTRATION_REPOSITORY, AUTHORIZE_ADMINISTRATION],
      useFactory: (
        r: AdministrationRepository,
        a: ReturnType<typeof authorizeAdministration>,
      ) => monitorPartners(r, a),
    },
  ],
  exports: [AUTHORIZE_ADMINISTRATION],
})
export class AdministrationModule {}
