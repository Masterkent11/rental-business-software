import {
  BadRequestException,
  Controller,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import type { FastifyRequest } from 'fastify';
import {
  CONFIRM_BOOKING_PAYMENT,
  START_BOOKING_PAYMENT,
} from './payment.tokens.ts';
import type {
  confirmBookingPayment,
  startBookingPayment,
} from '../../features/pay-booking/pay-booking.ts';
import {
  AmountMismatchError,
  BookingNotHeldError,
} from '../../application/ports/payment-repository.ts';
import { WebhookVerificationError } from '../../application/ports/payment-gateway.ts';

@Controller()
export class PaymentsController {
  constructor(
    @Inject(START_BOOKING_PAYMENT)
    private readonly start: ReturnType<typeof startBookingPayment>,
    @Inject(CONFIRM_BOOKING_PAYMENT)
    private readonly confirm: ReturnType<typeof confirmBookingPayment>,
  ) {}

  @Post('bookings/:id/payment-intent')
  async intent(@Param('id') id: string) {
    if (!z.guid().safeParse(id).success) {
      throw new BadRequestException('Not a booking id');
    }

    try {
      return await this.start({ occupancyId: id });
    } catch (error) {
      if (error instanceof BookingNotHeldError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Post('webhooks/payments')
  async webhook(
    @Req() request: FastifyRequest,
    @Headers('x-signature') signature?: string,
  ) {
    // The raw body, not the parsed one: a signature is over bytes, and
    // re-serialising JSON does not reliably reproduce them.
    const rawBody = (request as FastifyRequest & { rawBody?: string }).rawBody;
    if (typeof rawBody !== 'string') {
      throw new BadRequestException('Missing body');
    }

    try {
      const result = await this.confirm({ rawBody, signature });

      // A replay gets the same 200. The provider needs to stop retrying, and
      // the work was already done.
      return {
        applied: result?.applied ?? false,
        stayId: result?.stayId ?? null,
      };
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        throw new UnauthorizedException('Signature check failed');
      }
      if (error instanceof AmountMismatchError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof BookingNotHeldError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
