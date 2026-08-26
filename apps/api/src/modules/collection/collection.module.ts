import { Module } from '@nestjs/common';
import { CollectionController } from './collection.controller.ts';
import {
  APPLY_PAYMENT_TO_INVOICE,
  INVOICE_REPOSITORY,
  ISSUE_INVOICE,
  OWNER_COLLECTION,
} from './collection.tokens.ts';
import { IDENTITY_PROVIDER, RESOLVE_PRINCIPAL, USER_REPOSITORY } from '../me/me.tokens.ts';
import { postgresInvoiceRepository } from '../../infrastructure/postgres/invoice-repository.pg.ts';
import { jwksIdentityProvider } from '../../infrastructure/supabase/jwks-identity-provider.ts';
import { postgresUserRepository } from '../../infrastructure/postgres/user-repository.pg.ts';
import { resolvePrincipal } from '../../features/authenticate/resolve-principal.ts';
import {
  applyPaymentToInvoice,
  issueInvoice,
  ownerCollection,
} from '../../features/collect-rent/collect-rent.ts';
import type { InvoiceRepository } from '../../application/ports/invoice-repository.ts';
import type { IdentityProvider } from '../../application/ports/identity-provider.ts';
import type { UserRepository } from '../../application/ports/user-repository.ts';

/**
 * Composition for the owner's money.
 *
 * Principal resolution is re-provided here rather than imported, matching the
 * other feature modules: `MeModule` exports nothing, so each module composes
 * the identity ports it needs from the same two factories.
 */
@Module({
  controllers: [CollectionController],
  providers: [
    {
      provide: INVOICE_REPOSITORY,
      useFactory: (): InvoiceRepository => postgresInvoiceRepository(),
    },
    {
      provide: OWNER_COLLECTION,
      inject: [INVOICE_REPOSITORY],
      useFactory: (invoices: InvoiceRepository) => ownerCollection(invoices),
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
