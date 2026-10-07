import {
  BadRequestException,
  Controller,
  Headers,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { START_BOOKING_PAYMENT } from '@/modules/payments/payment.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { startBookingPayment } from '@/application/payments/start-booking-payment/start-booking-payment.use-case.ts';

@Controller('bookings')
export class StartBookingPaymentController {
  constructor(
    @Inject(START_BOOKING_PAYMENT)
    private readonly start: ReturnType<typeof startBookingPayment>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post(':id/payment-intent')
  async intent(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    if (!z.guid().safeParse(id).success) {
      throw new BadRequestException('Not a booking id');
    }
    const principal = await this.resolve({ authorization, organizationId: null });
    return this.start({ occupancyId: id, userId: principal.userId });
  }
}
