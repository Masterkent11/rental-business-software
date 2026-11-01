import { PartnerShellModule } from '@/modules/partners/partner-shell.module.ts';
import { AdministrationModule } from '@/modules/administration/administration.module.ts';
import { MarketingModule } from '@/modules/marketing/marketing.module.ts';
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
import { AgentsModule } from './modules/agents/agents.module.ts';
import { InquiriesModule } from './modules/inquiries/inquiries.module.ts';
import { ViewingsModule } from './modules/viewings/viewings.module.ts';
import { DiscoveryModule } from './modules/discovery/discovery.module.ts';
import { ContentModule } from './modules/content/content.module.ts';
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

@Module({
  imports: [
    IdentityModule,
    PartnerShellModule,
    AdministrationModule,
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
    AgentsModule,
    MarketingModule,
    InquiriesModule,
    ViewingsModule,
    DiscoveryModule,
    ContentModule,
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
