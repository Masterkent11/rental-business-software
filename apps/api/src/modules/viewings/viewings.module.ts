import { Module } from '@nestjs/common';
import { CustomerViewingsController } from './controllers/customer-viewings.controller.ts';
import { AgentViewingsController, OrganizationViewingsController } from './controllers/partner-viewings.controller.ts';
import {
  CUSTOMER_VIEWING_ACTION,
  GET_MY_VIEWING,
  LIST_MY_VIEWINGS,
  LIST_PARTNER_VIEWINGS,
  PARTNER_VIEWING_ACTION,
  REQUEST_VIEWING,
} from './viewing.tokens.ts';
import {
  AGENT_REPOSITORY,
  CLOCK,
  INQUIRY_REPOSITORY,
  LEAD_ASSIGNMENT_REPOSITORY,
  LEAD_ASSIGNMENT_SETTINGS,
  NOTIFICATION_REPOSITORY,
  SHARED_LISTING_REPOSITORY,
  VIEWING_REPOSITORY,
} from '@/modules/shared/shared.tokens.ts';
import { AssignmentModule } from '@/modules/assignment/assignment.module.ts';
import { REASSIGN_LEAD, RESOLVE_LEAD_ASSIGNMENT } from '@/modules/assignment/assignment.tokens.ts';
import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { InquiryRepository } from '@/application/ports/repositories/inquiry-repository.port.ts';
import type { LeadAssignmentRepository } from '@/application/ports/repositories/lead-assignment-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { LeadAssignmentSettings } from '@/application/assignment/assignment.types.ts';
import type { resolveLeadAssignment } from '@/application/assignment/resolve-lead-assignment/resolve-lead-assignment.use-case.ts';
import type { reassignLead } from '@/application/assignment/reassign-lead/reassign-lead.use-case.ts';
import { requestViewing } from '@/application/viewings/request-viewing/request-viewing.use-case.ts';
import { getMyViewing } from '@/application/viewings/get-my-viewing/get-my-viewing.use-case.ts';
import { listMyViewings } from '@/application/viewings/list-my-viewings/list-my-viewings.use-case.ts';
import { customerViewingAction } from '@/application/viewings/customer-viewing-action/customer-viewing-action.use-case.ts';
import { listPartnerViewings } from '@/application/viewings/list-partner-viewings/list-partner-viewings.use-case.ts';
import { partnerViewingAction } from '@/application/viewings/partner-viewing-action/partner-viewing-action.use-case.ts';

@Module({
  imports: [AssignmentModule],
  controllers: [CustomerViewingsController, OrganizationViewingsController, AgentViewingsController],
  providers: [
    {
      provide: REQUEST_VIEWING,
      inject: [
        VIEWING_REPOSITORY,
        SHARED_LISTING_REPOSITORY,
        INQUIRY_REPOSITORY,
        AGENT_REPOSITORY,
        NOTIFICATION_REPOSITORY,
        RESOLVE_LEAD_ASSIGNMENT,
        REASSIGN_LEAD,
        CLOCK,
        LEAD_ASSIGNMENT_SETTINGS,
      ],
      useFactory: (
        viewings: ViewingRepository,
        listings: ListingRepository,
        inquiries: InquiryRepository,
        agents: AgentRepository,
        notifications: NotificationRepository,
        resolve: ReturnType<typeof resolveLeadAssignment>,
        reassign: ReturnType<typeof reassignLead>,
        clock: Clock,
        settings: LeadAssignmentSettings,
      ) => requestViewing({ viewings, listings, inquiries, agents, notifications, resolve, reassign, clock, settings }),
    },
    {
      provide: GET_MY_VIEWING,
      inject: [VIEWING_REPOSITORY, AGENT_REPOSITORY],
      useFactory: (v: ViewingRepository, a: AgentRepository) => getMyViewing(v, a),
    },
    { provide: LIST_MY_VIEWINGS, inject: [VIEWING_REPOSITORY], useFactory: (v: ViewingRepository) => listMyViewings(v) },
    {
      provide: CUSTOMER_VIEWING_ACTION,
      inject: [VIEWING_REPOSITORY, AGENT_REPOSITORY, NOTIFICATION_REPOSITORY, CLOCK],
      useFactory: (viewings: ViewingRepository, agents: AgentRepository, notifications: NotificationRepository, clock: Clock) =>
        customerViewingAction({ viewings, agents, notifications, clock }),
    },
    { provide: LIST_PARTNER_VIEWINGS, inject: [VIEWING_REPOSITORY], useFactory: (v: ViewingRepository) => listPartnerViewings(v) },
    {
      provide: PARTNER_VIEWING_ACTION,
      inject: [VIEWING_REPOSITORY, INQUIRY_REPOSITORY, LEAD_ASSIGNMENT_REPOSITORY, NOTIFICATION_REPOSITORY, REASSIGN_LEAD, CLOCK],
      useFactory: (
        viewings: ViewingRepository,
        inquiries: InquiryRepository,
        assignments: LeadAssignmentRepository,
        notifications: NotificationRepository,
        reassign: ReturnType<typeof reassignLead>,
        clock: Clock,
      ) => partnerViewingAction({ viewings, inquiries, assignments, notifications, reassign, clock }),
    },
  ],
})
export class ViewingsModule {}
