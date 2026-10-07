import { Controller, Get, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ListingsModule } from './modules/listings/listings.module.ts';
import { MeModule } from './modules/me/me.module.ts';
import { BookingsModule } from './modules/bookings/bookings.module.ts';
import { PaymentsModule } from './modules/payments/payments.module.ts';
import { ApplicationsModule } from './modules/applications/applications.module.ts';
import { ToursModule } from './modules/tours/tours.module.ts';
import { CollectionModule } from './modules/collection/collection.module.ts';
import { MessagingModule } from './modules/messaging/messaging.module.ts';
import { NotificationsModule } from './modules/notifications/notifications.module.ts';
import { IdentityModule } from './modules/shared/identity.module.ts';
import { PlatformModule } from './modules/shared/platform.module.ts';
import { PresentationExceptionFilter } from './modules/shared/http-exception.filter.ts';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

/**
 * The modular monolith root.
 */
@Module({
  imports: [
    IdentityModule,
    PlatformModule,
    ListingsModule,
    MeModule,
    BookingsModule,
    PaymentsModule,
    ApplicationsModule,
    ToursModule,
    CollectionModule,
    MessagingModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: PresentationExceptionFilter,
    },
  ],
})
export class AppModule {}
