import { BadRequestException, Body, Controller, Get, Headers, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import {
  GET_MY_INQUIRY,
  GET_MY_OPEN_INQUIRY_FOR_LISTING,
  LIST_MY_INQUIRIES,
  SUBMIT_INQUIRY,
} from '@/modules/inquiries/inquiry.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { submitInquiry } from '@/application/inquiries/submit-inquiry/submit-inquiry.use-case.ts';
import type {
  getMyInquiry,
  getMyOpenInquiryForListing,
  listMyInquiries,
} from '@/application/inquiries/list-my-inquiries/list-my-inquiries.use-case.ts';
import { submitInquirySchema } from '@/modules/inquiries/dto/inquiry.dto.ts';
import {
  toCustomerInquiryHttpResponse,
  toSubmittedInquiryHttpResponse,
} from '@/modules/inquiries/mappers/inquiry-http.mapper.ts';

const guid = (value: string, what: string) => {
  if (!z.guid().safeParse(value).success) throw new NotFoundException(`No such ${what}`);
  return value;
};

@Controller()
export class CustomerInquiriesController {
  constructor(
    @Inject(SUBMIT_INQUIRY) private readonly submit: ReturnType<typeof submitInquiry>,
    @Inject(LIST_MY_INQUIRIES) private readonly list: ReturnType<typeof listMyInquiries>,
    @Inject(GET_MY_INQUIRY) private readonly getOne: ReturnType<typeof getMyInquiry>,
    @Inject(GET_MY_OPEN_INQUIRY_FOR_LISTING) private readonly openForListing: ReturnType<typeof getMyOpenInquiryForListing>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  private principal(auth: string | undefined) {
    return this.resolve({ authorization: auth, organizationId: null });
  }

  @Post('listings/:id/inquiries')
  async create(@Param('id') listingId: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    const parsed = submitInquirySchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid inquiry');
    const principal = await this.principal(auth);
    const result = await this.submit({
      principal,
      listingId: guid(listingId, 'listing'),
      message: parsed.data.message,
      questions: parsed.data.questions,
      buyerBudgetCentavos: parsed.data.buyerBudgetCentavos,
      clientRef: parsed.data.clientRef,
      referralCode: parsed.data.referralCode,
    });
    return toSubmittedInquiryHttpResponse(result);
  }

  @Get('me/inquiries')
  async mine(@Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    const rows = await this.list({ principal });
    return { items: rows.map(toCustomerInquiryHttpResponse) };
  }

  @Get('me/inquiries/:id')
  async one(@Param('id') id: string, @Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    return toCustomerInquiryHttpResponse(await this.getOne({ principal, inquiryId: guid(id, 'inquiry') }));
  }

  @Get('me/listings/:id/inquiry')
  async forListing(@Param('id') listingId: string, @Headers('authorization') auth?: string) {
    const principal = await this.principal(auth);
    const inquiry = await this.openForListing({ principal, listingId: guid(listingId, 'listing') });
    return { inquiry: inquiry ? toCustomerInquiryHttpResponse(inquiry) : null };
  }
}
