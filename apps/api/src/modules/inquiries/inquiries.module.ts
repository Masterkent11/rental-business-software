import { Module } from '@nestjs/common';
import { CustomerInquiriesController } from './controllers/customer-inquiries.controller.ts';
import {
  AgentInquiriesController,
  OrganizationInquiriesController,
} from './controllers/partner-inquiries.controller.ts';
import {
  GET_MY_INQUIRY,
  GET_MY_OPEN_INQUIRY_FOR_LISTING,
  GET_PARTNER_INQUIRY,
  LIST_MY_INQUIRIES,
  LIST_PARTNER_INQUIRIES,
  SUBMIT_INQUIRY,
  UPDATE_INQUIRY_STATUS,
} from './inquiry.tokens.ts';
import {
  AGENT_REPOSITORY,
  INQUIRY_REPOSITORY,
  MESSAGING_REPOSITORY,
  NOTIFICATION_REPOSITORY,
  SHARED_LISTING_REPOSITORY,
} from '@/modules/shared/shared.tokens.ts';
import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { InquiryRepository } from '@/application/ports/repositories/inquiry-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { MessagingRepository } from '@/application/ports/repositories/messaging-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import { submitInquiry } from '@/application/inquiries/submit-inquiry/submit-inquiry.use-case.ts';
import {
  getMyInquiry,
  getMyOpenInquiryForListing,
  listMyInquiries,
} from '@/application/inquiries/list-my-inquiries/list-my-inquiries.use-case.ts';
import {
  getPartnerInquiry,
  listPartnerInquiries,
} from '@/application/inquiries/list-partner-inquiries/list-partner-inquiries.use-case.ts';
import { updateInquiryStatus } from '@/application/inquiries/update-inquiry-status/update-inquiry-status.use-case.ts';

@Module({
  controllers: [CustomerInquiriesController, OrganizationInquiriesController, AgentInquiriesController],
  providers: [
    {
      provide: SUBMIT_INQUIRY,
      inject: [INQUIRY_REPOSITORY, SHARED_LISTING_REPOSITORY, MESSAGING_REPOSITORY, AGENT_REPOSITORY, NOTIFICATION_REPOSITORY],
      useFactory: (i: InquiryRepository, l: ListingRepository, m: MessagingRepository, a: AgentRepository, n: NotificationRepository) =>
        submitInquiry(i, l, m, a, n),
    },
    { provide: LIST_MY_INQUIRIES, inject: [INQUIRY_REPOSITORY], useFactory: (i: InquiryRepository) => listMyInquiries(i) },
    { provide: GET_MY_INQUIRY, inject: [INQUIRY_REPOSITORY], useFactory: (i: InquiryRepository) => getMyInquiry(i) },
    {
      provide: GET_MY_OPEN_INQUIRY_FOR_LISTING,
      inject: [INQUIRY_REPOSITORY],
      useFactory: (i: InquiryRepository) => getMyOpenInquiryForListing(i),
    },
    { provide: LIST_PARTNER_INQUIRIES, inject: [INQUIRY_REPOSITORY], useFactory: (i: InquiryRepository) => listPartnerInquiries(i) },
    { provide: GET_PARTNER_INQUIRY, inject: [INQUIRY_REPOSITORY], useFactory: (i: InquiryRepository) => getPartnerInquiry(i) },
    { provide: UPDATE_INQUIRY_STATUS, inject: [INQUIRY_REPOSITORY], useFactory: (i: InquiryRepository) => updateInquiryStatus(i) },
  ],
})
export class InquiriesModule {}
