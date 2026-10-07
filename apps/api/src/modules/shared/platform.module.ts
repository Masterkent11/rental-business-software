import { Global, Module } from '@nestjs/common';
import {
  BOOKING_REPOSITORY,
  CLOCK,
  LISTING_MEDIA_STORAGE,
  MESSAGING_REPOSITORY,
  NOTIFICATION_REPOSITORY,
} from '@/modules/shared/shared.tokens.ts';
import { SystemClock } from '@/infrastructure/system/system-clock.provider.ts';
import { postgresNotificationRepository } from '@/infrastructure/postgres/repositories/postgres-notification.repository.ts';
import { postgresBookingRepository } from '@/infrastructure/postgres/repositories/postgres-booking.repository.ts';
import { postgresMessagingRepository } from '@/infrastructure/postgres/repositories/postgres-messaging.repository.ts';
import { supabaseListingMediaStorage } from '@/infrastructure/storage/supabase-listing-media.adapter.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { BookingRepository } from '@/application/ports/repositories/booking-repository.port.ts';
import type { MessagingRepository } from '@/application/ports/repositories/messaging-repository.port.ts';
import type { ListingMediaStorage } from '@/application/ports/storage/listing-media.port.ts';

@Global()
@Module({
  providers: [
    { provide: CLOCK, useFactory: (): Clock => new SystemClock() },
    { provide: NOTIFICATION_REPOSITORY, useFactory: (): NotificationRepository => postgresNotificationRepository() },
    { provide: BOOKING_REPOSITORY, useFactory: (): BookingRepository => postgresBookingRepository() },
    { provide: MESSAGING_REPOSITORY, useFactory: (): MessagingRepository => postgresMessagingRepository() },
    { provide: LISTING_MEDIA_STORAGE, useFactory: (): ListingMediaStorage => supabaseListingMediaStorage() },
  ],
  exports: [CLOCK, NOTIFICATION_REPOSITORY, BOOKING_REPOSITORY, MESSAGING_REPOSITORY, LISTING_MEDIA_STORAGE],
})
export class PlatformModule {}
