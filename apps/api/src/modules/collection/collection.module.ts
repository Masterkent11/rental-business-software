import { Module } from '@nestjs/common';
import { GetOwnerCollectionController } from './controllers/get-owner-collection.controller.ts';
import { IssueInvoiceController } from './controllers/issue-invoice.controller.ts';
import { ApplyPaymentToInvoiceController } from './controllers/apply-payment-to-invoice.controller.ts';
import {
  APPLY_PAYMENT_TO_INVOICE,
  INVOICE_REPOSITORY,
  ISSUE_INVOICE,
  OWNER_COLLECTION,
} from './collection.tokens.ts';
import { IDENTITY_PROVIDER, RESOLVE_PRINCIPAL, USER_REPOSITORY } from '@/modules/me/me.tokens.ts';
import { postgresInvoiceRepository } from '@/infrastructure/postgres/repositories/postgres-invoice.repository.ts';
import { jwksIdentityProvider } from '@/infrastructure/supabase/jwks-identity.provider.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import { getOwnerCollection } from '@/application/collection/get-owner-collection/get-owner-collection.use-case.ts';
import { issueInvoice } from '@/application/collection/issue-invoice/issue-invoice.use-case.ts';
import { applyPaymentToInvoice } from '@/application/collection/apply-payment-to-invoice/apply-payment-to-invoice.use-case.ts';
import type { InvoiceRepository } from '@/application/ports/repositories/invoice-repository.port.ts';
import type { IdentityProvider } from '@/application/ports/providers/identity-provider.port.ts';
import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';

@Module({
  controllers: [
    GetOwnerCollectionController,
    IssueInvoiceController,
    ApplyPaymentToInvoiceController,
  ],
  providers: [
    {
      provide: INVOICE_REPOSITORY,
      useFactory: (): InvoiceRepository => postgresInvoiceRepository(),
    },
    {
      provide: OWNER_COLLECTION,
      inject: [INVOICE_REPOSITORY],
      useFactory: (invoices: InvoiceRepository) => getOwnerCollection(invoices),
    },
    {
      provide: ISSUE_INVOICE,
      inject: [INVOICE_REPOSITORY],
      useFactory: (invoices: InvoiceRepository) => issueInvoice(invoices),
    },
    {
      provide: APPLY_PAYMENT_TO_INVOICE,
      inject: [INVOICE_REPOSITORY],
      useFactory: (invoices: InvoiceRepository) => applyPaymentToInvoice(invoices),
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
export class CollectionModule {}
