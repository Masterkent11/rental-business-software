import { Module } from "@nestjs/common";
import { PartnerShellController } from "@/modules/partners/controllers/partner-shell.controller.ts";
import { PARTNER_SHELL } from "@/modules/partners/partner-shell.tokens.ts";
import { postgresPartnerShellRepository } from "@/infrastructure/postgres/repositories/postgres-partner-shell.repository.ts";
import { partnerLogoProcessor } from "@/infrastructure/media/partner-logo-processor.adapter.ts";
import { searchPartner } from "@/application/partners/search-partner/search-partner.use-case.ts";
import { readPartnerBranding } from "@/application/partners/read-partner-branding/read-partner-branding.use-case.ts";
import { savePartnerBranding } from "@/application/partners/save-partner-branding/save-partner-branding.use-case.ts";
export function partnerShellActions() {
  const repo = postgresPartnerShellRepository();
  return {
    search: searchPartner(repo),
    read: readPartnerBranding(repo),
    save: savePartnerBranding(repo, partnerLogoProcessor()),
  };
}
@Module({
  controllers: [PartnerShellController],
  providers: [{ provide: PARTNER_SHELL, useFactory: partnerShellActions }],
})
export class PartnerShellModule {}
