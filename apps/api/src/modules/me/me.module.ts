import { Module } from '@nestjs/common';
import { AGENT_REPOSITORY } from '@/modules/shared/shared.tokens.ts';
import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import { GetMeController } from './controllers/get-me.controller.ts';
import { GetMyStaysController } from './controllers/get-my-stays.controller.ts';
import { SavedListingsController } from './controllers/saved-listings.controller.ts';
import {
  IDENTITY_PROVIDER,
  RESOLVE_PRINCIPAL,
  USER_REPOSITORY,
  GET_MY_STAYS,
  GET_SAVED_LISTINGS,
  SAVE_LISTING,
  UNSAVE_LISTING,
  GET_ME,
  UPDATE_MY_PROFILE,
  GET_TENANT_HOME,
  REQUEST_TENANT_MAINTENANCE,
} from './me.tokens.ts';
import { getMe } from '@/application/me/get-me/get-me.use-case.ts';
import { updateMyProfile } from '@/application/me/update-my-profile/update-my-profile.use-case.ts';
import { jwksIdentityProvider } from '@/infrastructure/supabase/jwks-identity.provider.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import { getMyStays } from '@/application/me/get-my-stays/get-my-stays.use-case.ts';
import { getSavedListings } from '@/application/me/get-saved-listings/get-saved-listings.use-case.ts';
import { saveListing } from '@/application/me/save-listing/save-listing.use-case.ts';
import { unsaveListing } from '@/application/me/unsave-listing/unsave-listing.use-case.ts';
import type { IdentityProvider } from '@/application/ports/providers/identity-provider.port.ts';
import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';
import { TenantHomeController } from './controllers/tenant-home.controller.ts';
import { postgresTenantHomeRepository } from '@/infrastructure/postgres/repositories/postgres-tenant-home.repository.ts';
import { getTenantHome } from '@/application/me/get-tenant-home/get-tenant-home.use-case.ts';
import { CLOCK } from '@/modules/shared/shared.tokens.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import { MessagingModule } from '@/modules/messaging/messaging.module.ts';
import { START_CONVERSATION, SEND_CUSTOMER_MESSAGE } from '@/modules/messaging/messaging.tokens.ts';
import type { startConversation } from '@/application/messaging/start-conversation/start-conversation.use-case.ts';
import type { sendCustomerMessage } from '@/application/messaging/send-message/send-message.use-case.ts';
import { requestTenantMaintenance } from '@/application/me/get-tenant-home/request-tenant-maintenance.use-case.ts';

@Module({
  imports: [MessagingModule],
  controllers: [GetMeController, GetMyStaysController, SavedListingsController, TenantHomeController],
  providers: [
    {
      provide: REQUEST_TENANT_MAINTENANCE,
      inject: [GET_TENANT_HOME, START_CONVERSATION, SEND_CUSTOMER_MESSAGE],
      useFactory: (
        home: ReturnType<typeof getTenantHome>,
        start: ReturnType<typeof startConversation>,
        send: ReturnType<typeof sendCustomerMessage>,
      ) => requestTenantMaintenance(home, start, send),
    },
    {
      provide: GET_TENANT_HOME,
      inject: [CLOCK],
      useFactory: (clock: Clock) => getTenantHome(postgresTenantHomeRepository(), clock),
    },
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
    {
      provide: GET_ME,
      inject: [USER_REPOSITORY, AGENT_REPOSITORY],
      useFactory: (users: UserRepository, agents: AgentRepository) => getMe(users, agents),
    },
    {
      provide: UPDATE_MY_PROFILE,
      inject: [USER_REPOSITORY],
      useFactory: (users: UserRepository) => updateMyProfile(users),
    },
    {
      provide: GET_MY_STAYS,
      inject: [USER_REPOSITORY],
      useFactory: (users: UserRepository) => getMyStays(users),
    },
    {
      provide: GET_SAVED_LISTINGS,
      inject: [USER_REPOSITORY],
      useFactory: (users: UserRepository) => getSavedListings(users),
    },
    {
      provide: SAVE_LISTING,
      inject: [USER_REPOSITORY],
      useFactory: (users: UserRepository) => saveListing(users),
    },
    {
      provide: UNSAVE_LISTING,
      inject: [USER_REPOSITORY],
      useFactory: (users: UserRepository) => unsaveListing(users),
    },
  ],
})
export class MeModule {}
