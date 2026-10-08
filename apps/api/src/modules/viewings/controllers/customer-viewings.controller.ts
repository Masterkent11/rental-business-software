import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import {
  CUSTOMER_VIEWING_ACTION,
  LIST_MY_VIEWINGS,
  LIST_VIEWING_SLOTS,
  REQUEST_VIEWING,
} from '@/modules/viewings/viewing.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { listViewingSlots } from '@/application/viewings/list-viewing-slots/list-viewing-slots.use-case.ts';
import type { requestViewing } from '@/application/viewings/request-viewing/request-viewing.use-case.ts';
import type { listMyViewings } from '@/application/viewings/list-my-viewings/list-my-viewings.use-case.ts';
import type { customerViewingAction } from '@/application/viewings/customer-viewing-action/customer-viewing-action.use-case.ts';
import { customerViewingActionSchema, requestViewingSchema } from '@/modules/viewings/dto/viewing.dto.ts';
import {
  toCustomerViewingHttpResponse,
  toViewingDaysHttpResponse,
} from '@/modules/viewings/mappers/viewing-http.mapper.ts';

const guid = (value: string, what: string) => {
  if (!z.guid().safeParse(value).success) throw new NotFoundException(`No such ${what}`);
  return value;
};

@Controller()
export class CustomerViewingsController {
  constructor(
    @Inject(LIST_VIEWING_SLOTS) private readonly slots: ReturnType<typeof listViewingSlots>,
    @Inject(REQUEST_VIEWING) private readonly request: ReturnType<typeof requestViewing>,
    @Inject(LIST_MY_VIEWINGS) private readonly list: ReturnType<typeof listMyViewings>,
    @Inject(CUSTOMER_VIEWING_ACTION) private readonly act: ReturnType<typeof customerViewingAction>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get('listings/:id/viewing-slots')
  async availableSlots(@Param('id') listingId: string) {
    return toViewingDaysHttpResponse(await this.slots({ listingId: guid(listingId, 'listing') }));
  }

  @Post('listings/:id/viewings')
  async create(@Param('id') listingId: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    const parsed = requestViewingSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid request');
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    const result = await this.request({
      principal,
      listingId: guid(listingId, 'listing'),
      scheduledAt: new Date(parsed.data.scheduledAt),
      note: parsed.data.note,
      clientRef: parsed.data.clientRef,
    });
    return { viewing: toCustomerViewingHttpResponse(result.viewing), created: result.created };
  }

  @Get('me/viewings')
  async mine(@Headers('authorization') auth?: string) {
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    const rows = await this.list({ principal });
    return { items: rows.map(toCustomerViewingHttpResponse) };
  }

  @Post('me/viewings/:id/action')
  @HttpCode(200)
  async action(@Param('id') id: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    const parsed = customerViewingActionSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid request');
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    const viewing = await this.act({
      principal,
      viewingId: guid(id, 'viewing'),
      action: parsed.data.action,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      note: parsed.data.note,
    });
    return toCustomerViewingHttpResponse(viewing);
  }
}
