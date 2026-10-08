import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { LIST_PARTNER_VIEWINGS, PARTNER_VIEWING_ACTION } from '@/modules/viewings/viewing.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { listPartnerViewings } from '@/application/viewings/list-partner-viewings/list-partner-viewings.use-case.ts';
import type { partnerViewingAction } from '@/application/viewings/partner-viewing-action/partner-viewing-action.use-case.ts';
import { partnerViewingActionSchema, viewingRangeSchema } from '@/modules/viewings/dto/viewing.dto.ts';
import { toPartnerViewingHttpResponse } from '@/modules/viewings/mappers/viewing-http.mapper.ts';

const parse = <T>(schema: z.ZodType<T>, raw: unknown): T => {
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid request');
  return parsed.data;
};

const guid = (value: string, what: string) => {
  if (!z.guid().safeParse(value).success) throw new BadRequestException(`Not a valid ${what} id`);
  return value;
};

const rangeFrom = (raw: unknown) => {
  const range = parse(viewingRangeSchema, raw);
  return {
    ...(range.from ? { from: new Date(range.from) } : {}),
    ...(range.to ? { to: new Date(range.to) } : {}),
  };
};

@Controller('organizations/:organizationId/viewings')
export class OrganizationViewingsController {
  constructor(
    @Inject(LIST_PARTNER_VIEWINGS) private readonly list: ReturnType<typeof listPartnerViewings>,
    @Inject(PARTNER_VIEWING_ACTION) private readonly act: ReturnType<typeof partnerViewingAction>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  private principal(organizationId: string, auth: string | undefined) {
    return this.resolve({ authorization: auth, organizationId: guid(organizationId, 'organization') });
  }

  @Get()
  async index(@Param('organizationId') organizationId: string, @Query() query: unknown, @Headers('authorization') auth?: string) {
    const principal = await this.principal(organizationId, auth);
    const rows = await this.list({ principal, organizationId, range: rangeFrom(query) });
    return { items: rows.map(toPartnerViewingHttpResponse) };
  }

  @Post(':id/action')
  @HttpCode(200)
  async action(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(partnerViewingActionSchema, body);
    const principal = await this.principal(organizationId, auth);
    return toPartnerViewingHttpResponse(
      await this.act({ principal, organizationId, viewingId: guid(id, 'viewing'), action: input.action, note: input.note }),
    );
  }
}

@Controller('agent/viewings')
export class AgentViewingsController {
  constructor(
    @Inject(LIST_PARTNER_VIEWINGS) private readonly list: ReturnType<typeof listPartnerViewings>,
    @Inject(PARTNER_VIEWING_ACTION) private readonly act: ReturnType<typeof partnerViewingAction>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get()
  async index(@Query() query: unknown, @Headers('authorization') auth?: string) {
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    const rows = await this.list({ principal, organizationId: null, range: rangeFrom(query) });
    return { items: rows.map(toPartnerViewingHttpResponse) };
  }

  @Post(':id/action')
  @HttpCode(200)
  async action(@Param('id') id: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    const input = parse(partnerViewingActionSchema, body);
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    return toPartnerViewingHttpResponse(
      await this.act({ principal, organizationId: null, viewingId: guid(id, 'viewing'), action: input.action, note: input.note }),
    );
  }
}
