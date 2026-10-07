import { Global, Module } from '@nestjs/common';
import { IDENTITY_PROVIDER, RESOLVE_PRINCIPAL, USER_REPOSITORY } from '@/modules/me/me.tokens.ts';
import { jwksIdentityProvider } from '@/infrastructure/supabase/jwks-identity.provider.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { IdentityProvider } from '@/application/ports/providers/identity-provider.port.ts';
import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';

@Global()
@Module({
  providers: [
    { provide: IDENTITY_PROVIDER, useFactory: (): IdentityProvider => jwksIdentityProvider() },
    { provide: USER_REPOSITORY, useFactory: (): UserRepository => postgresUserRepository() },
    {
      provide: RESOLVE_PRINCIPAL,
      inject: [IDENTITY_PROVIDER, USER_REPOSITORY],
      useFactory: (identity: IdentityProvider, users: UserRepository) =>
        resolvePrincipal(identity, users),
    },
  ],
  exports: [IDENTITY_PROVIDER, USER_REPOSITORY, RESOLVE_PRINCIPAL],
})
export class IdentityModule {}
