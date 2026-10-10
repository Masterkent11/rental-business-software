import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import {
  CUSTOMER_VIEWING_ACTION,
  GET_MY_VIEWING,
  LIST_MY_VIEWINGS,
  REQUEST_VIEWING,
} from '@/modules/viewings/viewing.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { requestViewing } from '@/application/viewings/request-viewing/request-viewing.use-case.ts';
import type { getMyViewing } from '@/application/viewings/get-my-viewing/get-my-viewing.use-case.ts';
import type { listMyViewings } from '@/application/viewings/list-my-viewings/list-my-viewings.use-case.ts';
import type { customerViewingAction } from '@/application/viewings/customer-viewing-action/customer-viewing-action.use-case.ts';
import { customerViewingActionSchema, requestViewingSchema } from '@/modules/viewings/dto/viewing.dto.ts';
import {
  toCustomerViewingHttpResponse,
  toViewingRequestHttpResponse,
} from '@/modules/viewings/mappers/viewing-http.mapper.ts';

const guid = (value: string, what: string) => {
  if (!z.guid().safeParse(value).success) throw new NotFoundException(`No such ${what}`);
  return value;
};

const parse = <T>(schema: z.ZodType<T>, raw: unknown): T => {
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid request');
  return parsed.data;
};

@Controller()
export class CustomerViewingsController {
  constructor(
    @Inject(REQUEST_VIEWING) private readonly request: ReturnType<typeof requestViewing>,
    @Inject(GET_MY_VIEWING) private readonly find: ReturnType<typeof getMyViewing>,
    @Inject(LIST_MY_VIEWINGS) private readonly list: ReturnType<typeof listMyViewings>,
    @Inject(CUSTOMER_VIEWING_ACTION) private readonly act: ReturnType<typeof customerViewingAction>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post('listings/:id/viewings')
  async create(@Param('id') listingId: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    const input = parse(requestViewingSchema, body);
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    const result = await this.request({
      principal,
      listingId: guid(listingId, 'listing'),
      preferredDate: input.preferredDate,
      preferredWindow: input.preferredTimeWindow,
      note: input.note,
      clientRef: input.idempotencyKey,
      referralCode: input.referralCode,
    });
    return { ...toViewingRequestHttpResponse(result), created: result.created };
  }

  @Get('me/viewings')
  async mine(@Headers('authorization') auth?: string) {
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    const rows = await this.list({ principal });
    return { items: rows.map(toCustomerViewingHttpResponse) };
  }

  @Get('me/viewings/:id')
  async one(@Param('id') id: string, @Headers('authorization') auth?: string) {
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    return toViewingRequestHttpResponse(await this.find({ principal, viewingId: guid(id, 'viewing') }));
  }

  @Post('me/viewings/:id/action')
  @HttpCode(200)
  async action(@Param('id') id: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    const input = parse(customerViewingActionSchema, body);
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    const view = await this.act({
      principal,
      viewingId: guid(id, 'viewing'),
      action: input.action,
      preferredDate: input.preferredDate,
      preferredWindow: input.preferredTimeWindow,
      note: input.note,
    });
    return toViewingRequestHttpResponse(view);
  }
}
