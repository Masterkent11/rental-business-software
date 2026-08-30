import {
  BadRequestException,
  Controller,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { START_BOOKING_PAYMENT } from '@/modules/payments/payment.tokens.ts';
import type { startBookingPayment } from '@/application/payments/start-booking-payment/start-booking-payment.use-case.ts';

@Controller('bookings')
export class StartBookingPaymentController {
  constructor(
    @Inject(START_BOOKING_PAYMENT)
    private readonly start: ReturnType<typeof startBookingPayment>,
  ) {}

  @Post(':id/payment-intent')
  async intent(@Param('id') id: string) {
    if (!z.guid().safeParse(id).success) {
      throw new BadRequestException('Not a booking id');
    }

    return this.start({ occupancyId: id });
  }
}
