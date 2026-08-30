import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { ISSUE_INVOICE } from '@/modules/collection/collection.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { issueInvoice } from '@/application/collection/issue-invoice/issue-invoice.use-case.ts';
import { centavos } from '@/domain/shared/money.ts';
import { issueInvoiceSchema } from '@/modules/collection/dto/issue-invoice.dto.ts';
import { toInvoiceHttpResponse } from '@/modules/collection/mappers/collection-http.mapper.ts';

@Controller('organizations/:organizationId/invoices')
export class IssueInvoiceController {
  constructor(
    @Inject(ISSUE_INVOICE)
    private readonly issueUseCase: ReturnType<typeof issueInvoice>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post()
  async raise(
    @Param('organizationId') organizationId: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    if (!z.guid().safeParse(organizationId).success) {
      throw new BadRequestException('Not an id');
    }

    const parsed = issueInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    const principal = await this.resolve({ authorization: auth, organizationId });
    const invoice = await this.issueUseCase({
      principal,
      organizationId,
      ...parsed.data,
      lines: parsed.data.lines.map((line) => ({
        ...line,
        amountCentavos: centavos(line.amountCentavos),
      })),
    });

    return toInvoiceHttpResponse(invoice);
  }
}
