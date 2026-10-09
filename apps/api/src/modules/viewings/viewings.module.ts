import { Module } from '@nestjs/common';
import { CustomerViewingsController } from './controllers/customer-viewings.controller.ts';
import { AgentViewingsController, OrganizationViewingsController } from './controllers/partner-viewings.controller.ts';
import {
  CUSTOMER_VIEWING_ACTION,
  LIST_MY_VIEWINGS,
  LIST_PARTNER_VIEWINGS,
  LIST_VIEWING_SLOTS,
  PARTNER_VIEWING_ACTION,
  REQUEST_VIEWING,
} from './viewing.tokens.ts';
import {
  AGENT_REPOSITORY,
  CLOCK,
  INQUIRY_REPOSITORY,
  MESSAGING_REPOSITORY,
  NOTIFICATION_REPOSITORY,
  SHARED_LISTING_REPOSITORY,
  VIEWING_REPOSITORY,
} from '@/modules/shared/shared.tokens.ts';
import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { InquiryRepository } from '@/application/ports/repositories/inquiry-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { MessagingRepository } from '@/application/ports/repositories/messaging-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import { listViewingSlots } from '@/application/viewings/list-viewing-slots/list-viewing-slots.use-case.ts';
import { requestViewing } from '@/application/viewings/request-viewing/request-viewing.use-case.ts';
import { listMyViewings } from '@/application/viewings/list-my-viewings/list-my-viewings.use-case.ts';
import { customerViewingAction } from '@/application/viewings/customer-viewing-action/customer-viewing-action.use-case.ts';
import { listPartnerViewings } from '@/application/viewings/list-partner-viewings/list-partner-viewings.use-case.ts';
import { partnerViewingAction } from '@/application/viewings/partner-viewing-action/partner-viewing-action.use-case.ts';

@Module({
  controllers: [CustomerViewingsController, OrganizationViewingsController, AgentViewingsController],
  providers: [
    {
      provide: LIST_VIEWING_SLOTS,
      inject: [SHARED_LISTING_REPOSITORY, VIEWING_REPOSITORY, CLOCK],
      useFactory: (l: ListingRepository, v: ViewingRepository, c: Clock) => listViewingSlots(l, v, c),
    },
    {
      provide: REQUEST_VIEWING,
      inject: [VIEWING_REPOSITORY, SHARED_LISTING_REPOSITORY, INQUIRY_REPOSITORY, MESSAGING_REPOSITORY, AGENT_REPOSITORY, NOTIFICATION_REPOSITORY, CLOCK],
      useFactory: (
        v: ViewingRepository,
        l: ListingRepository,
        i: InquiryRepository,
        m: MessagingRepository,
        a: AgentRepository,
        n: NotificationRepository,
        c: Clock,
      ) => requestViewing(v, l, i, m, a, n, c),
    },
    { provide: LIST_MY_VIEWINGS, inject: [VIEWING_REPOSITORY], useFactory: (v: ViewingRepository) => listMyViewings(v) },
    {
      provide: CUSTOMER_VIEWING_ACTION,
      inject: [VIEWING_REPOSITORY, AGENT_REPOSITORY, NOTIFICATION_REPOSITORY, CLOCK],
      useFactory: (v: ViewingRepository, a: AgentRepository, n: NotificationRepository, c: Clock) => customerViewingAction(v, a, n, c),
    },
    { provide: LIST_PARTNER_VIEWINGS, inject: [VIEWING_REPOSITORY], useFactory: (v: ViewingRepository) => listPartnerViewings(v) },
    {
      provide: PARTNER_VIEWING_ACTION,
      inject: [VIEWING_REPOSITORY, INQUIRY_REPOSITORY, NOTIFICATION_REPOSITORY, CLOCK],
      useFactory: (v: ViewingRepository, i: InquiryRepository, n: NotificationRepository, c: Clock) => partnerViewingAction(v, i, n, c),
    },
  ],
})
export class ViewingsModule {}
