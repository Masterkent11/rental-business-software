import { Module } from "@nestjs/common";
import { AgentMarketingController } from "@/modules/marketing/controllers/agent-marketing.controller.ts";
import { MARKETING_USE_CASES } from "@/modules/marketing/marketing.tokens.ts";
import {
  AGENT_REPOSITORY,
  SHARED_LISTING_REPOSITORY,
  REPRESENTATION_REPOSITORY,
  LISTING_GATE,
  CLOCK,
} from "@/modules/shared/shared.tokens.ts";
import type { AgentRepository } from "@/application/ports/repositories/agent-repository.port.ts";
import type { ListingRepository } from "@/application/ports/repositories/listing-repository.port.ts";
import type { RepresentationRepository } from "@/application/ports/repositories/representation-repository.port.ts";
import type { ListingGate } from "@/application/identity/partner-access.rules.ts";
import type { Clock } from "@/application/ports/providers/clock.port.ts";
import { marketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import type { MarketingUseCases } from "@/application/marketing/marketing.types.ts";
import { postgresMarketingRepository } from "@/infrastructure/postgres/repositories/postgres-marketing.repository.ts";
import { supabaseMediaStorage } from "@/infrastructure/storage/supabase-media-storage.adapter.ts";
import { marketingMediaProcessor } from "@/infrastructure/media/marketing-media-processor.adapter.ts";
import { loadMarketing } from "@/application/marketing/load-marketing/load-marketing.use-case.ts";
import { saveMarketingDraft } from "@/application/marketing/save-marketing-draft/save-marketing-draft.use-case.ts";
import { getMarketingDraft } from "@/application/marketing/get-marketing-draft/get-marketing-draft.use-case.ts";
import { removeMarketingDraft } from "@/application/marketing/remove-marketing-draft/remove-marketing-draft.use-case.ts";
import { duplicateMarketingDraft } from "@/application/marketing/duplicate-marketing-draft/duplicate-marketing-draft.use-case.ts";
import { uploadMarketingMedia } from "@/application/marketing/upload-marketing-media/upload-marketing-media.use-case.ts";
import { readMarketingMedia } from "@/application/marketing/read-marketing-media/read-marketing-media.use-case.ts";
import { removeMarketingMedia } from "@/application/marketing/remove-marketing-media/remove-marketing-media.use-case.ts";
import { loadFacebookChannel } from "@/application/marketing/load-facebook-channel/load-facebook-channel.use-case.ts";
import { startFacebookConnection } from "@/application/marketing/start-facebook-connection/start-facebook-connection.use-case.ts";
import { completeFacebookAuthorization } from "@/application/marketing/complete-facebook-authorization/complete-facebook-authorization.use-case.ts";
import { selectFacebookPage } from "@/application/marketing/select-facebook-page/select-facebook-page.use-case.ts";
import { disconnectFacebookPage } from "@/application/marketing/disconnect-facebook-page/disconnect-facebook-page.use-case.ts";
import { postgresFacebookConnectionRepository } from "@/infrastructure/postgres/repositories/postgres-facebook-connection.repository.ts";
import { facebookConnectionConfig } from "@/infrastructure/config/facebook-connection-config.ts";
import { facebookConnectionSecrets } from "@/infrastructure/social/facebook-connection-secrets.adapter.ts";
import { metaFacebookPages } from "@/infrastructure/social/meta-facebook-pages.adapter.ts";
@Module({
  controllers: [AgentMarketingController],
  providers: [
    {
      provide: MARKETING_USE_CASES,
      inject: [
        AGENT_REPOSITORY,
        SHARED_LISTING_REPOSITORY,
        REPRESENTATION_REPOSITORY,
        LISTING_GATE,
        CLOCK,
      ],
      useFactory: (
        agents: AgentRepository,
        listings: ListingRepository,
        representations: RepresentationRepository,
        gate: ListingGate,
        clock: Clock,
      ): MarketingUseCases => {
        const repo = postgresMarketingRepository(),
          storage = supabaseMediaStorage(undefined, undefined, undefined, {
            bucket: "marketing-media",
            private: true,
          }),
          processor = marketingMediaProcessor(),
          access = marketingAccess(
            agents,
            listings,
            representations,
            gate,
            clock,
          );
        const facebook = postgresFacebookConnectionRepository();
        const config = facebookConnectionConfig();
        const meta = config ? metaFacebookPages(config) : null;
        const secrets = config ? facebookConnectionSecrets(config.key) : null;
        return {
          facebook: {
            load: loadFacebookChannel(facebook, access, !!config),
            start: startFacebookConnection(facebook, access, meta, secrets),
            complete: completeFacebookAuthorization(
              facebook,
              access,
              meta,
              secrets,
            ),
            select: selectFacebookPage(facebook, access, !!config),
            disconnect: disconnectFacebookPage(facebook, access),
          },
          load: loadMarketing(repo, access),
          save: saveMarketingDraft(repo, access),
          get: getMarketingDraft(repo, access),
          remove: removeMarketingDraft(repo, access),
          duplicate: duplicateMarketingDraft(repo, access),
          upload: uploadMarketingMedia(repo, storage, processor, access),
          readMedia: readMarketingMedia(repo, storage, access),
          removeMedia: removeMarketingMedia(repo, storage, access),
        };
      },
    },
  ],
})
export class MarketingModule {}
