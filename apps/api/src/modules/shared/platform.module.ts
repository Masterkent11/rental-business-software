import { Global, Module } from '@nestjs/common';
import {
  AGENT_REPOSITORY,
  AGENT_TASK_REPOSITORY,
  ANALYTICS_REPOSITORY,
  BOOKING_REPOSITORY,
  CLOCK,
  INQUIRY_REPOSITORY,
  LEAD_ASSIGNMENT_REPOSITORY,
  LEAD_ASSIGNMENT_SETTINGS,
  LISTING_GATE,
  LISTING_MEDIA_STORAGE,
  MESSAGING_REPOSITORY,
  NOTIFICATION_REPOSITORY,
  REPRESENTATION_REPOSITORY,
  SHARED_LISTING_REPOSITORY,
  SHARED_MEDIA_STORAGE,
  SHARED_TOUR_REPOSITORY,
  TOUR_GATE,
  VIEWING_REPOSITORY,
} from '@/modules/shared/shared.tokens.ts';
import { SystemClock } from '@/infrastructure/system/system-clock.provider.ts';
import { postgresNotificationRepository } from '@/infrastructure/postgres/repositories/postgres-notification.repository.ts';
import { postgresBookingRepository } from '@/infrastructure/postgres/repositories/postgres-booking.repository.ts';
import { postgresMessagingRepository } from '@/infrastructure/postgres/repositories/postgres-messaging.repository.ts';
import { postgresAgentRepository } from '@/infrastructure/postgres/repositories/postgres-agent.repository.ts';
import { postgresRepresentationRepository } from '@/infrastructure/postgres/repositories/postgres-representation.repository.ts';
import { postgresInquiryRepository } from '@/infrastructure/postgres/repositories/postgres-inquiry.repository.ts';
import { postgresLeadAssignmentRepository } from '@/infrastructure/postgres/repositories/postgres-lead-assignment.repository.ts';
import { loadEnvironmentConfig } from '@/infrastructure/config/environment-config.ts';
import { postgresViewingRepository } from '@/infrastructure/postgres/repositories/postgres-viewing.repository.ts';
import { postgresAgentTaskRepository } from '@/infrastructure/postgres/repositories/postgres-agent-task.repository.ts';
import { postgresAnalyticsRepository } from '@/infrastructure/postgres/repositories/postgres-analytics.repository.ts';
import { postgresListingRepository } from '@/infrastructure/postgres/repositories/postgres-listing.repository.ts';
import { postgresTourRepository } from '@/infrastructure/postgres/repositories/postgres-tour.repository.ts';
import { supabaseListingMediaStorage } from '@/infrastructure/storage/supabase-listing-media.adapter.ts';
import { supabaseMediaStorage } from '@/infrastructure/storage/supabase-media-storage.adapter.ts';
import { partnerListingGate, partnerTourGate } from '@/application/identity/partner-access.rules.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { BookingRepository } from '@/application/ports/repositories/booking-repository.port.ts';
import type { MessagingRepository } from '@/application/ports/repositories/messaging-repository.port.ts';
import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { RepresentationRepository } from '@/application/ports/repositories/representation-repository.port.ts';
import type { InquiryRepository } from '@/application/ports/repositories/inquiry-repository.port.ts';
import type { LeadAssignmentRepository } from '@/application/ports/repositories/lead-assignment-repository.port.ts';
import type { LeadAssignmentSettings } from '@/application/assignment/assignment.types.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { AgentTaskRepository } from '@/application/ports/repositories/agent-task-repository.port.ts';
import type { AnalyticsRepository } from '@/application/ports/repositories/analytics-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { TourRepository } from '@/application/ports/repositories/tour-repository.port.ts';
import type { ListingMediaStorage } from '@/application/ports/storage/listing-media.port.ts';
import type { MediaStorage } from '@/application/ports/storage/media-storage.port.ts';

const SHARED = [
  CLOCK,
  NOTIFICATION_REPOSITORY,
  BOOKING_REPOSITORY,
  MESSAGING_REPOSITORY,
  LISTING_MEDIA_STORAGE,
  AGENT_REPOSITORY,
  REPRESENTATION_REPOSITORY,
  INQUIRY_REPOSITORY,
  VIEWING_REPOSITORY,
  LEAD_ASSIGNMENT_REPOSITORY,
  LEAD_ASSIGNMENT_SETTINGS,
  AGENT_TASK_REPOSITORY,
  ANALYTICS_REPOSITORY,
  SHARED_LISTING_REPOSITORY,
  SHARED_TOUR_REPOSITORY,
  SHARED_MEDIA_STORAGE,
  LISTING_GATE,
  TOUR_GATE,
];

@Global()
@Module({
  providers: [
    { provide: CLOCK, useFactory: (): Clock => new SystemClock() },
    { provide: NOTIFICATION_REPOSITORY, useFactory: (): NotificationRepository => postgresNotificationRepository() },
    { provide: BOOKING_REPOSITORY, useFactory: (): BookingRepository => postgresBookingRepository() },
    { provide: MESSAGING_REPOSITORY, useFactory: (): MessagingRepository => postgresMessagingRepository() },
    { provide: LISTING_MEDIA_STORAGE, useFactory: (): ListingMediaStorage => supabaseListingMediaStorage() },
    { provide: AGENT_REPOSITORY, useFactory: (): AgentRepository => postgresAgentRepository() },
    { provide: REPRESENTATION_REPOSITORY, useFactory: (): RepresentationRepository => postgresRepresentationRepository() },
    { provide: INQUIRY_REPOSITORY, useFactory: (): InquiryRepository => postgresInquiryRepository() },
    { provide: VIEWING_REPOSITORY, useFactory: (): ViewingRepository => postgresViewingRepository() },
    { provide: LEAD_ASSIGNMENT_REPOSITORY, useFactory: (): LeadAssignmentRepository => postgresLeadAssignmentRepository() },
    {
      provide: LEAD_ASSIGNMENT_SETTINGS,
      useFactory: (): LeadAssignmentSettings => {
        const config = loadEnvironmentConfig();
        return {
          responseWindowMinutes: config.leadResponseWindowMinutes,
          sweepIntervalSeconds: config.leadSweepIntervalSeconds,
        };
      },
    },
    { provide: AGENT_TASK_REPOSITORY, useFactory: (): AgentTaskRepository => postgresAgentTaskRepository() },
    { provide: ANALYTICS_REPOSITORY, useFactory: (): AnalyticsRepository => postgresAnalyticsRepository() },
    { provide: SHARED_LISTING_REPOSITORY, useFactory: (): ListingRepository => postgresListingRepository() },
    { provide: SHARED_TOUR_REPOSITORY, useFactory: (): TourRepository => postgresTourRepository() },
    { provide: SHARED_MEDIA_STORAGE, useFactory: (): MediaStorage => supabaseMediaStorage() },
    {
      provide: LISTING_GATE,
      inject: [REPRESENTATION_REPOSITORY, CLOCK],
      useFactory: (representations: RepresentationRepository, clock: Clock) => partnerListingGate(representations, clock),
    },
    {
      provide: TOUR_GATE,
      inject: [REPRESENTATION_REPOSITORY, CLOCK],
      useFactory: (representations: RepresentationRepository, clock: Clock) => partnerTourGate(representations, clock),
    },
  ],
  exports: SHARED,
})
export class PlatformModule {}
