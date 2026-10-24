import { Module } from '@nestjs/common';
import { VerificationModule } from './verification.module.ts';
import { ConfirmTenancyController } from './controllers/confirm-tenancy.controller.ts';
import { CONFIRM_TENANCY } from './application.tokens.ts';
import { confirmTenancy } from '@/application/applications/confirm-tenancy/confirm-tenancy.use-case.ts';
import { postgresTenancyActivationRepository } from '@/infrastructure/postgres/repositories/postgres-tenancy-activation.repository.ts';
import { CLOCK } from '@/modules/shared/shared.tokens.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import { SubmitApplicationController } from './controllers/submit-application.controller.ts';
import { GetMyApplicationsController } from './controllers/get-my-applications.controller.ts';
import { GetMyApplicationController } from './controllers/get-my-application.controller.ts';
import { WithdrawApplicationController } from './controllers/withdraw-application.controller.ts';
import { AttachApplicationDocumentController } from './controllers/attach-application-document.controller.ts';
import { ReserveApplicationController } from './controllers/reserve-application.controller.ts';
import { ListOrganizationApplicationsController } from './controllers/list-organization-applications.controller.ts';
import { DecideApplicationController } from './controllers/decide-application.controller.ts';
import {
  APPLICATION_REPOSITORY,
  DOCUMENT_STORAGE,
  SUBMIT_APPLICATION,
  GET_MY_APPLICATIONS,
  GET_MY_APPLICATION,
  WITHDRAW_APPLICATION,
  CREATE_DOCUMENT_UPLOAD_TICKET,
  ATTACH_APPLICATION_DOCUMENT,
  RESERVE_APPLICATION,
  LIST_ORGANIZATION_APPLICATIONS,
  DECIDE_APPLICATION,
} from './application.tokens.ts';
import { IDENTITY_PROVIDER, RESOLVE_PRINCIPAL, USER_REPOSITORY } from '@/modules/me/me.tokens.ts';
import { postgresApplicationRepository } from '@/infrastructure/postgres/repositories/postgres-application.repository.ts';
import { supabaseDocumentStorage } from '@/infrastructure/storage/supabase-document-storage.adapter.ts';
import { jwksIdentityProvider } from '@/infrastructure/supabase/jwks-identity.provider.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { ApplicationRepository } from '@/application/ports/repositories/application-repository.port.ts';
import type { DocumentStorage } from '@/application/ports/storage/document-storage.port.ts';
import type { IdentityProvider } from '@/application/ports/providers/identity-provider.port.ts';
import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';

// Use Cases
import { submitApplication } from '@/application/applications/submit-application/submit-application.use-case.ts';
import { getMyApplications } from '@/application/applications/get-my-applications/get-my-applications.use-case.ts';
import { getMyApplication } from '@/application/applications/get-my-application/get-my-application.use-case.ts';
import { withdrawApplication } from '@/application/applications/withdraw-application/withdraw-application.use-case.ts';
import {
  createDocumentUploadTicket,
  attachApplicationDocument,
} from '@/application/applications/attach-application-document/attach-application-document.use-case.ts';
import { reserveApplication } from '@/application/applications/reserve-application/reserve-application.use-case.ts';
import { listOrganizationApplications } from '@/application/applications/list-organization-applications/list-organization-applications.use-case.ts';
import { decideApplication } from '@/application/applications/decide-application/decide-application.use-case.ts';

@Module({
  imports: [VerificationModule],
  controllers: [
    ConfirmTenancyController,
    SubmitApplicationController,
    GetMyApplicationsController,
    GetMyApplicationController,
    WithdrawApplicationController,
    AttachApplicationDocumentController,
    ReserveApplicationController,
    ListOrganizationApplicationsController,
    DecideApplicationController,
  ],
  providers: [
    { provide: CONFIRM_TENANCY, inject: [CLOCK], useFactory: (clock: Clock) => confirmTenancy(postgresTenancyActivationRepository(), clock) },
    // Adapters to Ports
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

    // Use Case Wire-ups
    {
      provide: SUBMIT_APPLICATION,
      inject: [APPLICATION_REPOSITORY],
      useFactory: (applications: ApplicationRepository) => submitApplication(applications),
    },
    {
      provide: GET_MY_APPLICATIONS,
      inject: [APPLICATION_REPOSITORY],
      useFactory: (applications: ApplicationRepository) => getMyApplications(applications),
    },
    {
      provide: GET_MY_APPLICATION,
      inject: [APPLICATION_REPOSITORY, DOCUMENT_STORAGE],
      useFactory: (applications: ApplicationRepository, storage: DocumentStorage) =>
        getMyApplication(applications, storage),
    },
    {
      provide: WITHDRAW_APPLICATION,
      inject: [APPLICATION_REPOSITORY],
      useFactory: (applications: ApplicationRepository) => withdrawApplication(applications),
    },
    {
      provide: CREATE_DOCUMENT_UPLOAD_TICKET,
      inject: [APPLICATION_REPOSITORY, DOCUMENT_STORAGE],
      useFactory: (applications: ApplicationRepository, storage: DocumentStorage) =>
        createDocumentUploadTicket(applications, storage),
    },
    {
      provide: ATTACH_APPLICATION_DOCUMENT,
      inject: [APPLICATION_REPOSITORY],
      useFactory: (applications: ApplicationRepository) =>
        attachApplicationDocument(applications),
    },
    {
      provide: RESERVE_APPLICATION,
      inject: [APPLICATION_REPOSITORY],
      useFactory: (applications: ApplicationRepository) => reserveApplication(applications),
    },
    {
      provide: LIST_ORGANIZATION_APPLICATIONS,
      inject: [APPLICATION_REPOSITORY],
      useFactory: (applications: ApplicationRepository) =>
        listOrganizationApplications(applications),
    },
    {
      provide: DECIDE_APPLICATION,
      inject: [APPLICATION_REPOSITORY],
      useFactory: (applications: ApplicationRepository) => decideApplication(applications),
    },
  ],
})
export class ApplicationsModule {}
