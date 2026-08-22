import { Controller, Get, Module } from '@nestjs/common';
import { ListingsModule } from './modules/listings/listings.module.ts';
import { MeModule } from './modules/me/me.module.ts';
import { BookingsModule } from './modules/bookings/bookings.module.ts';
import { PaymentsModule } from './modules/payments/payments.module.ts';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

/**
 * The modular monolith root.
 *
 * One deployable. Modules arrive as their sprints do — identity in Sprint 2,
 * availability and bookings in Sprint 3 — rather than as empty folders waiting
 * for them.
 */
@Module({ imports: [ListingsModule, MeModule, BookingsModule, PaymentsModule], controllers: [HealthController] })
export class AppModule {}
