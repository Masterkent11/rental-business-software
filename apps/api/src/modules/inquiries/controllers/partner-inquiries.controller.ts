import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Patch, Query } from '@nestjs/common';
import { z } from 'zod';
import {
  GET_PARTNER_INQUIRY,
  LIST_PARTNER_INQUIRIES,
  UPDATE_INQUIRY_STATUS,
} from '@/modules/inquiries/inquiry.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type {
  getPartnerInquiry,
  listPartnerInquiries,
} from '@/application/inquiries/list-partner-inquiries/list-partner-inquiries.use-case.ts';
import type { updateInquiryStatus } from '@/application/inquiries/update-inquiry-status/update-inquiry-status.use-case.ts';
import { inquiryFiltersSchema, inquiryStatusSchema } from '@/modules/inquiries/dto/inquiry.dto.ts';
import { toPartnerInquiryHttpResponse } from '@/modules/inquiries/mappers/inquiry-http.mapper.ts';

const parse = <T>(schema: z.ZodType<T>, raw: unknown): T => {
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid request');
  return parsed.data;
};

const guid = (value: string, what: string) => {
  if (!z.guid().safeParse(value).success) throw new BadRequestException(`Not a valid ${what} id`);
  return value;
};

const filtersFrom = (raw: unknown) => {
  const parsed = parse(inquiryFiltersSchema, raw);
  return {
    ...(parsed.status ? { status: parsed.status } : {}),
    ...(parsed.listingId ? { listingId: parsed.listingId } : {}),
  };
};

@Controller('organizations/:organizationId/inquiries')
export class OrganizationInquiriesController {
  constructor(
    @Inject(LIST_PARTNER_INQUIRIES) private readonly list: ReturnType<typeof listPartnerInquiries>,
    @Inject(GET_PARTNER_INQUIRY) private readonly getOne: ReturnType<typeof getPartnerInquiry>,
    @Inject(UPDATE_INQUIRY_STATUS) private readonly updateStatus: ReturnType<typeof updateInquiryStatus>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  private principal(organizationId: string, auth: string | undefined) {
    return this.resolve({ authorization: auth, organizationId: guid(organizationId, 'organization') });
  }

  @Get()
  async index(@Param('organizationId') organizationId: string, @Query() query: unknown, @Headers('authorization') auth?: string) {
    const principal = await this.principal(organizationId, auth);
    const rows = await this.list({ principal, organizationId, filters: filtersFrom(query) });
    return { items: rows.map(toPartnerInquiryHttpResponse) };
  }

  @Get(':id')
  async one(@Param('organizationId') organizationId: string, @Param('id') id: string, @Headers('authorization') auth?: string) {
    const principal = await this.principal(organizationId, auth);
    return toPartnerInquiryHttpResponse(await this.getOne({ principal, organizationId, inquiryId: guid(id, 'inquiry') }));
  }

  @Patch(':id/status')
  async status(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    const input = parse(inquiryStatusSchema, body);
    const principal = await this.principal(organizationId, auth);
    return toPartnerInquiryHttpResponse(
      await this.updateStatus({ principal, organizationId, inquiryId: guid(id, 'inquiry'), status: input.status, lostReason: input.lostReason }),
    );
  }
}

@Controller('agent/inquiries')
export class AgentInquiriesController {
  constructor(
    @Inject(LIST_PARTNER_INQUIRIES) private readonly list: ReturnType<typeof listPartnerInquiries>,
    @Inject(GET_PARTNER_INQUIRY) private readonly getOne: ReturnType<typeof getPartnerInquiry>,
    @Inject(UPDATE_INQUIRY_STATUS) private readonly updateStatus: ReturnType<typeof updateInquiryStatus>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  private principal(auth: string | undefined) {
    return this.resolve({ authorization: auth, organizationId: null });
  }

  @Get()
  async index(@Query() query: unknown, @Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    const rows = await this.list({ principal, organizationId: null, filters: filtersFrom(query) });
    return { items: rows.map(toPartnerInquiryHttpResponse) };
  }

  @Get(':id')
  async one(@Param('id') id: string, @Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    return toPartnerInquiryHttpResponse(await this.getOne({ principal, organizationId: null, inquiryId: guid(id, 'inquiry') }));
  }

  @Patch(':id/status')
  async status(@Param('id') id: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    const input = parse(inquiryStatusSchema, body);
    const principal = await this.principal(auth);
    return toPartnerInquiryHttpResponse(
      await this.updateStatus({ principal, organizationId: null, inquiryId: guid(id, 'inquiry'), status: input.status, lostReason: input.lostReason }),
    );
  }
}
