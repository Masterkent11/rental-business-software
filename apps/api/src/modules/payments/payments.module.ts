import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.ts';
import {
  CONFIRM_BOOKING_PAYMENT,
  PAYMENT_GATEWAY,
  PAYMENT_REPOSITORY,
  START_BOOKING_PAYMENT,
} from './payment.tokens.ts';
import { sandboxPaymentGateway } from '../../infrastructure/payments/sandbox-gateway.ts';
import { postgresPaymentRepository } from '../../infrastructure/postgres/payment-repository.pg.ts';
import {
  confirmBookingPayment,
  startBookingPayment,
} from '../../features/pay-booking/pay-booking.ts';
import type { PaymentGateway } from '../../application/ports/payment-gateway.ts';
import type { PaymentRepository } from '../../application/ports/payment-repository.ts';

/**
 * Composition for payments.
 *
 * The sandbox provider is named here and nowhere else. Adopting a real one is
 * a change to this `useFactory` — which is the whole of what ADR-0008 meant by
 * deferring the choice.
 */
@Module({
  controllers: [PaymentsController],
  providers: [
    { provide: PAYMENT_GATEWAY, useFactory: (): PaymentGateway => sandboxPaymentGateway() },
    { provide: PAYMENT_REPOSITORY, useFactory: (): PaymentRepository => postgresPaymentRepository() },
    {
      provide: START_BOOKING_PAYMENT,
      inject: [PAYMENT_REPOSITORY, PAYMENT_GATEWAY],
      useFactory: (repo: PaymentRepository, gateway: PaymentGateway) =>
        startBookingPayment(repo, gateway),
    },
    {
      provide: CONFIRM_BOOKING_PAYMENT,
      inject: [PAYMENT_REPOSITORY, PAYMENT_GATEWAY],
      useFactory: (repo: PaymentRepository, gateway: PaymentGateway) =>
        confirmBookingPayment(repo, gateway),
    },
  ],
})
export class PaymentsModule {}
