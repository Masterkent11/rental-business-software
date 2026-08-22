import { Module } from '@nestjs/common';
import { MeController } from './me.controller.ts';
import {
  IDENTITY_PROVIDER,
  RESOLVE_PRINCIPAL,
  USER_REPOSITORY,
} from './me.tokens.ts';
import { jwksIdentityProvider } from '../../infrastructure/supabase/jwks-identity-provider.ts';
import { postgresUserRepository } from '../../infrastructure/postgres/user-repository.pg.ts';
import { resolvePrincipal } from '../../features/authenticate/resolve-principal.ts';
import type { IdentityProvider } from '../../application/ports/identity-provider.ts';
import type { UserRepository } from '../../application/ports/user-repository.ts';

/**
 * Composition for identity.
 *
 * The only file that knows both that `resolvePrincipal` exists and that
 * Supabase and Postgres implement its two ports. Swapping Supabase Auth for
 * another OIDC provider is a change to one `useFactory` here.
 */
@Module({
  controllers: [MeController],
  providers: [
    {
      provide: IDENTITY_PROVIDER,
      useFactory: (): IdentityProvider => jwksIdentityProvider(),
    },
    {
      provide: USER_REPOSITORY,
      useFactory: (): UserRepository => postgresUserRepository(),
    },
    {
      provide: RESOLVE_PRINCIPAL,
      inject: [IDENTITY_PROVIDER, USER_REPOSITORY],
      useFactory: (identity: IdentityProvider, users: UserRepository) =>
        resolvePrincipal(identity, users),
    },
  ],
})
export class MeModule {}
