import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Inject, NotFoundException, Param, Post, Query } from '@nestjs/common';
import type { ZodType } from 'zod';
import {
  ACCEPT_POLICIES,
  GET_CONTENT_PAGE,
  LIST_CONTENT_PAGES,
  LIST_MY_ACCEPTANCES,
  SUBMIT_SUPPORT_REQUEST,
} from '@/modules/content/content.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { getContentPage, listContentPages } from '@/application/content/get-content/get-content.use-case.ts';
import type { acceptPolicies, listMyAcceptances } from '@/application/content/accept-policy/accept-policy.use-case.ts';
import type { submitSupportRequest } from '@/application/content/submit-support-request/submit-support-request.use-case.ts';
import {
  acceptPoliciesSchema,
  contentListQuerySchema,
  contentSlugSchema,
  supportRequestSchema,
} from '@/modules/content/dto/content.dto.ts';
import {
  toAcceptanceHttpResponse,
  toContentPageHttpResponse,
  toContentSummaryHttpResponse,
} from '@/modules/content/mappers/content-http.mapper.ts';

const parse = <T>(schema: ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value ?? {});
  if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid request');
  return parsed.data;
};

@Controller()
export class ContentController {
  constructor(
    @Inject(GET_CONTENT_PAGE) private readonly getPage: ReturnType<typeof getContentPage>,
    @Inject(LIST_CONTENT_PAGES) private readonly listPages: ReturnType<typeof listContentPages>,
    @Inject(ACCEPT_POLICIES) private readonly accept: ReturnType<typeof acceptPolicies>,
    @Inject(LIST_MY_ACCEPTANCES) private readonly myAcceptances: ReturnType<typeof listMyAcceptances>,
    @Inject(SUBMIT_SUPPORT_REQUEST) private readonly submitSupport: ReturnType<typeof submitSupportRequest>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get('content')
  async list(@Query() raw: unknown) {
    const q = parse(contentListQuerySchema, raw);
    return { items: (await this.listPages(q.kind)).map(toContentSummaryHttpResponse) };
  }

  @Get('content/:slug')
  async page(@Param('slug') slug: string) {
    if (!contentSlugSchema.safeParse(slug).success) throw new NotFoundException('That page does not exist');
    return toContentPageHttpResponse(await this.getPage(slug));
  }

  @Get('me/policy-acceptances')
  async acceptances(@Headers('authorization') auth?: string) {
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    return { items: (await this.myAcceptances({ principal })).map(toAcceptanceHttpResponse) };
  }

  @Post('me/policy-acceptances')
  async acceptPolicies(@Body() body: unknown, @Headers('authorization') auth?: string) {
    const input = parse(acceptPoliciesSchema, body);
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    const accepted = await this.accept({ principal, documents: input.documents, context: input.context, relatedId: input.relatedId });
    return { items: accepted.map(toAcceptanceHttpResponse) };
  }

  @Post('support/requests')
  @HttpCode(202)
  async support(@Body() body: unknown, @Headers('authorization') auth?: string) {
    const input = parse(supportRequestSchema, body);
    const principal = auth ? await this.resolve({ authorization: auth, organizationId: null }) : null;
    return this.submitSupport({ ...input, userId: principal?.userId ?? null });
  }
}
