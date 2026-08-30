import {
  BadRequestException,
  Controller,
  Headers,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CONFIRM_BOOKING_PAYMENT } from '@/modules/payments/payment.tokens.ts';
import type { confirmBookingPayment } from '@/application/payments/confirm-booking-payment/confirm-booking-payment.use-case.ts';
import { toPaymentConfirmationHttpResponse } from '@/modules/payments/mappers/payment-http.mapper.ts';

@Controller('webhooks')
export class ConfirmBookingPaymentController {
  constructor(
    @Inject(CONFIRM_BOOKING_PAYMENT)
    private readonly confirm: ReturnType<typeof confirmBookingPayment>,
  ) {}

  @Post('payments')
  async webhook(
    @Req() request: FastifyRequest,
    @Headers('x-signature') signature?: string,
  ) {
    const rawBody = (request as FastifyRequest & { rawBody?: string }).rawBody;
    if (typeof rawBody !== 'string') {
      throw new BadRequestException('Missing body');
    }

    const result = await this.confirm({ rawBody, signature });
    return toPaymentConfirmationHttpResponse(result);
  }
}
