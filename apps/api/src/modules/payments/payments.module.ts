import { Module } from '@nestjs/common';
import { StartBookingPaymentController } from './controllers/start-booking-payment.controller.ts';
import { ConfirmBookingPaymentController } from './controllers/confirm-booking-payment.controller.ts';
import { SimulateBookingPaymentController } from './controllers/simulate-booking-payment.controller.ts';
import {
  CONFIRM_BOOKING_PAYMENT,
  PAYMENT_GATEWAY,
  PAYMENT_REPOSITORY,
  SIMULATE_BOOKING_PAYMENT,
  START_BOOKING_PAYMENT,
} from './payment.tokens.ts';
import { sandboxPaymentGateway } from '@/infrastructure/payments/sandbox-payment-gateway.adapter.ts';
import { unavailablePaymentGateway } from '@/infrastructure/payments/unavailable-payment-gateway.adapter.ts';
import { loadEnvironmentConfig } from '@/infrastructure/config/environment-config.ts';
import { NOTIFICATION_REPOSITORY } from '@/modules/shared/shared.tokens.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import { postgresPaymentRepository } from '@/infrastructure/postgres/repositories/postgres-payment.repository.ts';
import { startBookingPayment } from '@/application/payments/start-booking-payment/start-booking-payment.use-case.ts';
import { confirmBookingPayment } from '@/application/payments/confirm-booking-payment/confirm-booking-payment.use-case.ts';
import { simulateBookingPayment } from '@/application/payments/simulate-booking-payment/simulate-booking-payment.use-case.ts';
import type { PaymentGateway } from '@/application/ports/providers/payment-gateway.port.ts';
import type { PaymentRepository } from '@/application/ports/repositories/payment-repository.port.ts';
import { IDENTITY_PROVIDER, RESOLVE_PRINCIPAL, USER_REPOSITORY } from '@/modules/me/me.tokens.ts';
import { jwksIdentityProvider } from '@/infrastructure/supabase/jwks-identity.provider.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { IdentityProvider } from '@/application/ports/providers/identity-provider.port.ts';
import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';

@Module({
  controllers: [
    StartBookingPaymentController,
    ConfirmBookingPaymentController,
    SimulateBookingPaymentController,
  ],
  providers: [
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (): PaymentGateway => {
        const config = loadEnvironmentConfig();
        return config.paymentProvider === 'sandbox'
          ? sandboxPaymentGateway(config.paymentWebhookSecret ?? 'sandbox-secret')
          : unavailablePaymentGateway();
      },
    },
    { provide: PAYMENT_REPOSITORY, useFactory: (): PaymentRepository => postgresPaymentRepository() },
    {
      provide: START_BOOKING_PAYMENT,
      inject: [PAYMENT_REPOSITORY, PAYMENT_GATEWAY],
      useFactory: (repo: PaymentRepository, gateway: PaymentGateway) =>
        startBookingPayment(repo, gateway),
    },
    {
      provide: CONFIRM_BOOKING_PAYMENT,
      inject: [PAYMENT_REPOSITORY, PAYMENT_GATEWAY, NOTIFICATION_REPOSITORY],
      useFactory: (repo: PaymentRepository, gateway: PaymentGateway, notifications: NotificationRepository) =>
        confirmBookingPayment(repo, gateway, notifications),
    },
    {
      provide: SIMULATE_BOOKING_PAYMENT,
      inject: [PAYMENT_REPOSITORY, PAYMENT_GATEWAY, CONFIRM_BOOKING_PAYMENT],
      useFactory: (
        repo: PaymentRepository,
        gateway: PaymentGateway,
        confirm: ReturnType<typeof confirmBookingPayment>,
      ) => simulateBookingPayment(repo, gateway, confirm),
    },
    { provide: IDENTITY_PROVIDER, useFactory: (): IdentityProvider => jwksIdentityProvider() },
    { provide: USER_REPOSITORY, useFactory: (): UserRepository => postgresUserRepository() },
    {
      provide: RESOLVE_PRINCIPAL,
      inject: [IDENTITY_PROVIDER, USER_REPOSITORY],
      useFactory: (identity: IdentityProvider, users: UserRepository) =>
        resolvePrincipal(identity, users),
    },
  ],
})
export class PaymentsModule {}
