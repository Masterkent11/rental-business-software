import { Module } from '@nestjs/common';
import { ContentController } from './controllers/content.controller.ts';
import {
  ACCEPT_POLICIES,
  CONTENT_REPOSITORY,
  GET_CONTENT_PAGE,
  LIST_CONTENT_PAGES,
  LIST_MY_ACCEPTANCES,
  SUBMIT_SUPPORT_REQUEST,
} from './content.tokens.ts';
import { postgresContentRepository } from '@/infrastructure/postgres/repositories/postgres-content.repository.ts';
import type { ContentRepository } from '@/application/ports/repositories/content-repository.port.ts';
import { getContentPage, listContentPages } from '@/application/content/get-content/get-content.use-case.ts';
import { acceptPolicies, listMyAcceptances } from '@/application/content/accept-policy/accept-policy.use-case.ts';
import { submitSupportRequest } from '@/application/content/submit-support-request/submit-support-request.use-case.ts';

@Module({
  controllers: [ContentController],
  providers: [
    { provide: CONTENT_REPOSITORY, useFactory: () => postgresContentRepository() },
    { provide: GET_CONTENT_PAGE, inject: [CONTENT_REPOSITORY], useFactory: (c: ContentRepository) => getContentPage(c) },
    { provide: LIST_CONTENT_PAGES, inject: [CONTENT_REPOSITORY], useFactory: (c: ContentRepository) => listContentPages(c) },
    { provide: ACCEPT_POLICIES, inject: [CONTENT_REPOSITORY], useFactory: (c: ContentRepository) => acceptPolicies(c) },
    { provide: LIST_MY_ACCEPTANCES, inject: [CONTENT_REPOSITORY], useFactory: (c: ContentRepository) => listMyAcceptances(c) },
    { provide: SUBMIT_SUPPORT_REQUEST, inject: [CONTENT_REPOSITORY], useFactory: (c: ContentRepository) => submitSupportRequest(c) },
  ],
})
export class ContentModule {}
