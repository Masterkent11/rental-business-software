import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { SIMULATE_BOOKING_PAYMENT } from '@/modules/payments/payment.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { simulateBookingPayment } from '@/application/payments/simulate-booking-payment/simulate-booking-payment.use-case.ts';
import { confirmSandboxBodySchema } from '@/modules/payments/dto/payment.dto.ts';
import { toPaymentConfirmationHttpResponse } from '@/modules/payments/mappers/payment-http.mapper.ts';

@Controller('bookings')
export class SimulateBookingPaymentController {
  constructor(
    @Inject(SIMULATE_BOOKING_PAYMENT)
    private readonly simulate: ReturnType<typeof simulateBookingPayment>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post(':id/payment-intent/confirm-sandbox')
  async confirmSandbox(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    if (!z.guid().safeParse(id).success) {
      throw new BadRequestException('Not a booking id');
    }

    const parsed = confirmSandboxBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    const principal = await this.resolve({ authorization, organizationId: null });
    const result = await this.simulate({
      occupancyId: id,
      paymentId: parsed.data.paymentId,
      userId: principal.userId,
    });
    return toPaymentConfirmationHttpResponse(result);
  }
}
