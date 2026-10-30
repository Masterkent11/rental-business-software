import { Inject, Logger, Module, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { IntervalJobScheduler } from '@/infrastructure/system/interval-job-scheduler.adapter.ts';
import type { JobScheduler, RecurringJob } from '@/application/ports/providers/job-scheduler.port.ts';
import { postgresPaymentNotificationOutbox } from '@/infrastructure/postgres/repositories/postgres-payment-notification-outbox.repository.ts';
import type { PaymentNotificationOutbox } from '@/application/ports/repositories/payment-notification-outbox.port.ts';
import { deliverPaymentNotifications } from '@/application/notifications/deliver-payment-notifications/deliver-payment-notifications.use-case.ts';
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

const OUTBOX = Symbol('PAYMENT_NOTIFICATION_OUTBOX');
const DELIVER = Symbol('DELIVER_PAYMENT_NOTIFICATIONS');
const SCHEDULER = Symbol('PAYMENT_NOTIFICATION_SCHEDULER');

@Module({
  controllers: [
    StartBookingPaymentController,
    ConfirmBookingPaymentController,
    SimulateBookingPaymentController,
  ],
  providers: [
    { provide: OUTBOX, useFactory: (): PaymentNotificationOutbox => postgresPaymentNotificationOutbox() },
    { provide: DELIVER, inject: [OUTBOX], useFactory: (outbox: PaymentNotificationOutbox) => deliverPaymentNotifications(outbox) },
    { provide: SCHEDULER, useFactory: (): JobScheduler => new IntervalJobScheduler(error => {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
      const detail = typeof code === 'string' && /^[A-Z0-9_]{3,20}$/.test(code) ? ` (${code})` : '';
      new Logger('PaymentNotifications').warn(`Payment notification delivery failed${detail}. Pending notifications are retained and will retry with backoff.`);
    }) },
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
      inject: [PAYMENT_REPOSITORY, PAYMENT_GATEWAY],
      useFactory: (repo: PaymentRepository, gateway: PaymentGateway) =>
        confirmBookingPayment(repo, gateway),
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
export class PaymentsModule implements OnApplicationBootstrap, OnModuleDestroy {
  private job: RecurringJob | null = null;
  constructor(@Inject(SCHEDULER) private readonly scheduler: JobScheduler,
    @Inject(DELIVER) private readonly deliver: ReturnType<typeof deliverPaymentNotifications>) {}
  onApplicationBootstrap() { this.job = this.scheduler.every(1_000, this.deliver); }
  onModuleDestroy() { this.job?.stop(); }
}
