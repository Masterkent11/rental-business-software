import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller.ts';
import { APPLICATION_REPOSITORY, DOCUMENT_STORAGE } from './application.tokens.ts';
import { IDENTITY_PROVIDER, RESOLVE_PRINCIPAL, USER_REPOSITORY } from '../me/me.tokens.ts';
import { postgresApplicationRepository } from '../../infrastructure/postgres/application-repository.pg.ts';
import { supabaseDocumentStorage } from '../../infrastructure/storage/supabase-document-storage.ts';
import { jwksIdentityProvider } from '../../infrastructure/supabase/jwks-identity-provider.ts';
import { postgresUserRepository } from '../../infrastructure/postgres/user-repository.pg.ts';
import { resolvePrincipal } from '../../features/authenticate/resolve-principal.ts';
import type { ApplicationRepository } from '../../application/ports/application-repository.ts';
import type { DocumentStorage } from '../../application/ports/document-storage.ts';
import type { IdentityProvider } from '../../application/ports/identity-provider.ts';
import type { UserRepository } from '../../application/ports/user-repository.ts';

@Module({
  controllers: [ApplicationsController],
  providers: [
    {
      provide: APPLICATION_REPOSITORY,
      useFactory: (): ApplicationRepository => postgresApplicationRepository(),
    },
    {
      provide: DOCUMENT_STORAGE,
      useFactory: (): DocumentStorage => supabaseDocumentStorage(),
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
export class ApplicationsModule {}
